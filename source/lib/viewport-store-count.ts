import {catalogMenuSearchFilter,menuSearchError,normalizedMenuQuery} from './menu-search.ts';
import {publicDb,publicConfig} from './supabase';
import {siteConfig,type SiteVariant} from './site-config';
import {storeIdentity,canonicalStoreKey,identityAnchors,resolvedStoreKey} from './store-identity.ts';
import {sourcedStoreMatches} from './map-sourced-stores.ts';
import {readSourcedStoreFeed} from './sourced-store-feed.ts';
import type {PublicSourcedStore} from './sourced-store';
import {isKoreanCoordinate} from './korean-region.ts';

export type ViewportBounds={south:number;north:number;west:number;east:number};
export type ViewportCountQuery={bounds:ViewportBounds;query:string;heat:number;flavor:string;category:string;budget:number};
export type ViewportStoreCountResult={count:number;complete:boolean;scope:'viewport';isMinimum:boolean;scannedRows:number;limit:number;reason?:'scan_limit'|'source_partial'};
/** Identity-only public data. Do not construct partial/fabricated Menu objects. */
export type ViewportStoreRow={id:string;place_id:string|null;owner_store_id:string|null;shop:string;address:string;lat:number|null;lng:number|null};

export const VIEWPORT_COUNT_FIELDS='id,place_id,owner_store_id,shop,address,lat,lng';
export const VIEWPORT_COUNT_MAX_ROWS=5000;
export const VIEWPORT_COUNT_PAGE_SIZE=500;
export const VIEWPORT_COUNT_MAX_PAGES=20;
export const VIEWPORT_COUNT_TIMEOUT_MS=8000;
const CACHE_TTL_MS=15000,CACHE_MAX_KEYS=64;
const cache=new Map<string,{expires:number;result:ViewportStoreCountResult}>();

export class InvalidViewportCountQuery extends Error{}
export class ViewportCountUnavailable extends Error{}

function invalid():never{throw new InvalidViewportCountQuery('지도 범위와 검색 조건을 확인해 주세요.')}

export function parseViewportCountParams(params:URLSearchParams,variant:SiteVariant='hot'):ViewportCountQuery{
 const one=(name:string)=>{if(params.getAll(name).length>1)invalid();return params.get(name)};
 const coordinate=(name:string,min:number,max:number)=>{
  const raw=one(name);
  if(raw===null||raw.length>32||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))invalid();
  const value=Number(raw);
  if(!Number.isFinite(value)||value<min||value>max)invalid();
  return value;
 };
 const bounds={south:coordinate('south',-90,90),north:coordinate('north',-90,90),west:coordinate('west',-180,180),east:coordinate('east',-180,180)};
 // This Korea-only map does not use wrapped / antimeridian viewports.
 if(bounds.south>=bounds.north||bounds.west>=bounds.east)invalid();
 const integer=(name:string,min:number,max:number)=>{
  const raw=one(name);if(raw===null||raw==='')return 0;
  if(raw.length>7||!/^\d+$/.test(raw))invalid();
  const value=Number(raw);if(value!==0&&(value<min||value>max))invalid();
  return value;
 };
 const rawQuery=one('q')||'';if(rawQuery.length>120)invalid();
 // Match communityMenus' keyword normalization; no raw PostgREST syntax is interpolated.
 if(menuSearchError(rawQuery))invalid();
 const query=normalizedMenuQuery(rawQuery);
 const theme=siteConfig(variant);
 const choice=(name:string,choices:readonly string[])=>{
  const value=one(name)||'';if(!value||value==='전체')return '';
  if(value.length>40||!choices.includes(value))invalid();return value;
 };
 return {bounds,query,heat:integer('heat',1,theme.heat.length),budget:integer('budget',100,1000000),flavor:choice('flavor',theme.flavors),category:choice('category',theme.categories)};
}

function catalogBounds(bounds:ViewportBounds):ViewportBounds|null{
 const intersection={south:Math.max(bounds.south,32.5),north:Math.min(bounds.north,39),west:Math.max(bounds.west,124),east:Math.min(bounds.east,132)};
 return intersection.south>intersection.north||intersection.west>intersection.east?null:intersection;
}

function realViewportRow(row:ViewportStoreRow,bounds:ViewportBounds):boolean{
 if(typeof row.id!=='string'||!row.id||typeof row.shop!=='string'||typeof row.address!=='string')return false;
 if(typeof row.lat!=='number'||typeof row.lng!=='number'||!isKoreanCoordinate(row.lat,row.lng))return false;
 if(row.lat<bounds.south||row.lat>bounds.north||row.lng<bounds.west||row.lng>bounds.east)return false;
 const fixtureId=/^(?:demo|fixture|test)(?:[-_:]|$)/i;
 if(fixtureId.test(row.id)||fixtureId.test(row.place_id||''))return false;
 const shop=row.shop.normalize('NFKC').replace(/\s/gu,'').toLocaleLowerCase('ko-KR');
 return !['나우고','나우고카페','rollbackfixture','operationsregressionfixture'].includes(shop);
}

/** The same canonical-first identity rules are used for pins and counts. */
export function countViewportStores(rows:readonly ViewportStoreRow[],bounds:ViewportBounds,complete=true,sources:readonly PublicSourcedStore[]=[],identitySources:readonly PublicSourcedStore[]=sources):number{
 const unique=[...new Map(rows.filter(row=>realViewportRow(row,bounds)).map(row=>[row.id,row])).values()];
 const sourceInBounds=sources.filter(store=>{const p=store.coordinates;return p&&p.lat>=bounds.south&&p.lat<=bounds.north&&p.lon>=bounds.west&&p.lon<=bounds.east});
 const anchors=identityAnchors([
  ...identitySources.map(store=>({key:'nowgo-'+store.id,name:store.name,address:store.address})),
  ...unique.flatMap(row=>{const key=canonicalStoreKey(row.place_id,row.owner_store_id);return key?[{key,name:row.shop,address:row.address}]:[]}),
 ]);
 const groups=new Set(sourceInBounds.map(store=>'nowgo-'+store.id));
 const canonicalKeys=new Set(groups),fixedUnowned=new Set<string>();let unresolvedIdentity=false;
 for(const row of unique){
  const key=resolvedStoreKey(row.shop,row.address,canonicalStoreKey(row.place_id,row.owner_store_id),row.place_id||row.id,anchors);
  groups.add(key);
  if(key.startsWith('nowgo-'))canonicalKeys.add(key);
  else{
   const identity=storeIdentity(row.shop,row.address),keys=identity?anchors.get(identity):undefined;
   if(!identity||(keys&&keys.size>1))fixedUnowned.add(key);else unresolvedIdentity=true;
  }
 }
 if(complete)return groups.size;
 // Unseen rows/sources can connect multiple legacy identities to one canonical
 // store. Only explicit canonical IDs and unmergeable groups are fixed minima.
 return canonicalKeys.size+fixedUnowned.size+(canonicalKeys.size===0&&unresolvedIdentity?1:0);
}

type PageRequest={afterId:string|null;limit:number;signal:AbortSignal};
type ReadPage=(request:PageRequest)=>PromiseLike<{data:ViewportStoreRow[]|null;error:unknown}>;
type ScanOptions={signal?:AbortSignal;maxRows?:number;pageSize?:number;maxPages?:number;timeoutMs?:number;onRows?:(rows:readonly ViewportStoreRow[])=>void};

function abortable<T>(pending:PromiseLike<T>,signal:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(new ViewportCountUnavailable('Viewport count request cancelled or timed out.'));
  if(signal.aborted){abort();return}
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(pending).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
 });
}

/** Separately testable scanner; bounded even when an upstream page is truncated. */
export async function scanViewportStoreCount(readPage:ReadPage,bounds:ViewportBounds,options:ScanOptions={}):Promise<ViewportStoreCountResult>{
 const bounded=(value:number|undefined,fallback:number)=>Number.isSafeInteger(value)&&value!>0?Math.min(value!,fallback):fallback;
 const maxRows=bounded(options.maxRows,VIEWPORT_COUNT_MAX_ROWS),pageSize=bounded(options.pageSize,VIEWPORT_COUNT_PAGE_SIZE),maxPages=bounded(options.maxPages,VIEWPORT_COUNT_MAX_PAGES);
 const controller=new AbortController(),abort=()=>controller.abort();
 const timeout=setTimeout(abort,bounded(options.timeoutMs,VIEWPORT_COUNT_TIMEOUT_MS));
 options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
 const rows:ViewportStoreRow[]=[];let afterId:string|null=null;
 const result=(complete:boolean):ViewportStoreCountResult=>{options.onRows?.(rows);return ({count:countViewportStores(rows,bounds,complete),complete,scope:'viewport',isMinimum:!complete,scannedRows:rows.length,limit:maxRows,...(complete?{}:{reason:'scan_limit' as const})})};
 try{
  for(let page=0;page<maxPages;page++){
   if(controller.signal.aborted)throw new ViewportCountUnavailable('Viewport count request cancelled or timed out.');
   // One look-ahead row distinguishes an exactly-full scan from a partial total.
   const limit=Math.min(pageSize,maxRows-rows.length||1);
   const {data,error}:{data:ViewportStoreRow[]|null;error:unknown}=await abortable(readPage({afterId,limit,signal:controller.signal}),controller.signal);
   if(error||!Array.isArray(data)||data.length>limit)throw new ViewportCountUnavailable('Public catalog is unavailable.');
   if(data.length===0)return result(true);
   if(rows.length===maxRows)return result(false);
   let last:string|null=afterId;
   for(const row of data){
    // ID ordering / progress is part of the query contract. Do not silently skip
    // a malformed/repeated page and claim the resulting total is complete.
    if(typeof row.id!=='string'||!row.id||(last!==null&&row.id<last)||(afterId!==null&&row.id<=afterId))throw new ViewportCountUnavailable('Public catalog pagination did not advance.');
    last=row.id;
   }
   rows.push(...data);afterId=last;
   // Always ask for the next keyset page, even when fewer than requested rows
   // came back: PostgREST may enforce a smaller configured max_rows.
  }
  return result(false);
 }finally{
  clearTimeout(timeout);options.signal?.removeEventListener('abort',abort);
 }
}

export async function viewportStoreCount(input:ViewportCountQuery,variant:SiteVariant='hot',signal?:AbortSignal):Promise<ViewportStoreCountResult>{
 if(menuSearchError(input.query))invalid();
 if(!publicConfig().ready)throw new ViewportCountUnavailable('Public catalog is not configured.');
 const key=JSON.stringify([variant,input]),cached=cache.get(key);
 if(cached&&cached.expires>Date.now()&&!signal?.aborted)return {...cached.result};
 const bounds=catalogBounds(input.bounds);
 if(!bounds&&(variant!=='hot'||input.bounds.north<33||input.bounds.south>39.6||input.bounds.east<124||input.bounds.west>132))return {count:0,complete:true,scope:'viewport',isMinimum:false,scannedRows:0,limit:VIEWPORT_COUNT_MAX_ROWS};
 const db=publicDb(); // Existing anonymous, public catalog access only.
 const controller=new AbortController(),abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 let scannedRows:readonly ViewportStoreRow[]=[];
 let result:ViewportStoreCountResult;
 try{
 const [catalog,feed]=await Promise.all([bounds?scanViewportStoreCount(async({afterId,limit,signal:pageSignal})=>{
  let request=db.from(siteConfig(variant).tables.menus).select(VIEWPORT_COUNT_FIELDS)
   .gte('lat',bounds.south).lte('lat',bounds.north).gte('lng',bounds.west).lte('lng',bounds.east);
  const searchFilter=catalogMenuSearchFilter(input.query);
  if(searchFilter)request=request.or(searchFilter);
  if(input.heat)request=request.eq('heat',input.heat);
  if(input.flavor)request=request.eq('flavor',input.flavor);
  if(input.category)request=request.eq('category',input.category);
  if(input.budget)request=request.lte('price',input.budget);
  if(afterId)request=request.gt('id',afterId);
  const {data,error}=await request.order('id',{ascending:true}).limit(limit).abortSignal(pageSignal);
  return {data:data as ViewportStoreRow[]|null,error};
 },bounds,{signal:controller.signal,onRows:rows=>{scannedRows=rows}}):Promise.resolve<ViewportStoreCountResult>({count:0,complete:true,scope:'viewport',isMinimum:false,scannedRows:0,limit:VIEWPORT_COUNT_MAX_ROWS}),variant==='hot'?readSourcedStoreFeed(controller.signal):Promise.resolve({stores:[],complete:true})]);
 const complete=catalog.complete&&feed.complete;
 const matchingSources=feed.stores.filter(store=>sourcedStoreMatches(store,input));
 result={...catalog,count:countViewportStores(scannedRows,input.bounds,complete,matchingSources,feed.stores),complete,isMinimum:!complete,...(!feed.complete?{reason:'source_partial' as const}:{})};
 }finally{controller.abort();signal?.removeEventListener('abort',abort)}
 // Small process-local cache bounds memory and repeated idle-event reads. Never
 // cache failures or partial counts; neither should mask recovery/completion.
 if(result.complete){
  if(cache.size>=CACHE_MAX_KEYS)cache.delete(cache.keys().next().value!);
  cache.set(key,{expires:Date.now()+CACHE_TTL_MS,result});
 }
 return result;
}
