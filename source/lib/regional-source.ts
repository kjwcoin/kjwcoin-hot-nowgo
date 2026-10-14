import priorReviewed from '../data/hot-regional-source-registry.json' with {type:'json'};
import sejongReviewed from '../data/hot-sejong-eight-source-registry.json' with {type:'json'};
import nextSejongReviewed from '../data/hot-sejong-next30-source-registry.json' with {type:'json'};
import next64Reviewed from '../data/hot-sejong-next64-source-registry.json' with {type:'json'};
import next47Reviewed from '../data/hot-sejong-next47-source-registry.json' with {type:'json'};
import next38Reviewed from '../data/hot-sejong-next38-source-registry.json' with {type:'json'};
const reviewed=[...priorReviewed,...sejongReviewed,...nextSejongReviewed,...next64Reviewed,...next47Reviewed,...next38Reviewed];
import type {PublicSourcedStore,SourcedStoreRow} from './sourced-store.ts';
/** Only public, release-reviewed facts belong here. Research packets are never imported. */
export type RegionalSourceDisclosure={
 kind:'attributed-wiki-facts'|'individual-public-facts';
 publisher:string;attribution:string;changes:string;scopeNotice:string;
 licenseUrl:string|null;revisionUrl:string|null;historyUrl:string|null;
};
export type ReviewedRegionalStore=PublicSourcedStore & {
 registrationState:'source-only';
 source:PublicSourcedStore['source'] & {disclosure:RegionalSourceDisclosure};
};
export const reviewedRegionalSources=reviewed as unknown as ReviewedRegionalStore[];
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=1000):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v).toISOString().slice(0,10)===v;
const stamp=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function sameRegionalFact(a:unknown,b:unknown):boolean{
 if(a===b)return true;
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>sameRegionalFact(v,b[i]));
 return object(a)&&object(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&sameRegionalFact(a[k],b[k]));
}
const reviewedArchiveBuildingIds:Readonly<Record<string,string>>={"archive-sejong-95eab7c0b9fe50ede57c":"3611010800100850001000008","archive-sejong-21614eeb649bd8fa08ad":"4473031025101010009000001","archive-sejong-5b044f1fa40d22e1ffa7":"3611010400105660005000001","archive-sejong-6d1f210cd98d51480e97":"3611011000106570000000001","archive-sejong-ecb297ba1d7583e0ef83":"4415035021100510006016360","archive-sejong-31bbfc925520a92da351":"4473034035100410000027551","archive-sejong-1dcfdfe9098176411591":"3611033025107270000000001"};
/** Exact supported origins, not arbitrary HTTPS/HTML. Attribution is plain text only. */
function validReviewed(store:ReviewedRegionalStore):boolean{
 const {source,coordinates,menus}=store,d=source?.disclosure;
 if(!source||!d||source.fieldProvenance||!text(store.id)||!text(store.slug,80)||!text(store.name,100)||!text(store.address,300)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(store.id)||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store.slug)||!coordinates||!Number.isFinite(coordinates.lat)||!Number.isFinite(coordinates.lon)||coordinates.lat<33||coordinates.lat>39.6||coordinates.lon<124||coordinates.lon>132||!stamp(source.checkedAt)||!(source.asOf===null||date(source.asOf)||typeof source.asOf==='string'&&/^\d{4}$/.test(source.asOf))||!text(d.publisher,150)||!text(d.attribution)||!text(d.changes)||!text(d.scopeNotice)||!Array.isArray(menus)||menus.length<1||menus.length>10)return false;
 if(store.registrationState!=='source-only'||store.indexable!==true||store.reportingState!=='pending'||store.ownership!=='unclaimed'||store.ownerClaimVerified!==false||store.pinStatus!=='gray'||store.operatingStatus!==null||store.currentMenuAvailability!==null)return false;
 if(menus.some(m=>!text(m.id,120)||!m.id.startsWith(store.sourceRef+':menu:')||!text(m.name,100)||m.price!==null||m.heat!==null||m.image!==null||m.sourceTaste!==null||m.provenance!==undefined))return false;
 if(new Set(menus.map(m=>m.id)).size!==menus.length)return false;
 if(d.kind==='attributed-wiki-facts')return /^aks-gwangju-[a-z0-9-]+$/.test(store.sourceRef)&&source.url.startsWith('https://dh.aks.ac.kr/~gwangju/wiki/index.php/')&&source.licenseName==='CC BY-SA 4.0'&&d.licenseUrl==='https://creativecommons.org/licenses/by-sa/4.0/'&&d.historyUrl===source.url.replace('index.php/','index.php?title=')+'&action=history'&&typeof d.revisionUrl==='string'&&/^https:\/\/dh\.aks\.ac\.kr\/~gwangju\/wiki\/index\.php\?title=[^&]+&oldid=\d+$/.test(d.revisionUrl);
 const mirror=/^purpleo-(qbh|xnx|smi)-(\d+)$/.exec(store.sourceRef);
 const fmr=/^purpleo-fmr-(\d+)$/.exec(store.sourceRef);
 const building=/^jusoga-building-(\d{25})-[a-f0-9]{8}$/.exec(store.sourceRef);
 const archiveBuildingId=Object.hasOwn(reviewedArchiveBuildingIds,store.sourceRef)?reviewedArchiveBuildingIds[store.sourceRef]:undefined;
 const supportedFactUrl=archiveBuildingId?source.url.startsWith(`https://jusoga.com/b/${archiveBuildingId}/`)&&!/[?#]/.test(source.url):fmr?source.url===`https://fmr.purpleo.co.kr/view/${fmr[1]}`:mirror?source.url===`https://${mirror[1]}.purpleo.kr/article/${mirror[2]}`:Boolean(building&&source.url.startsWith(`https://jusoga.com/b/${building[1]}/`)&&!/[?#]/.test(source.url));
 return d.kind==='individual-public-facts'&&supportedFactUrl&&source.licenseName===null&&d.licenseUrl===null&&d.revisionUrl===null&&d.historyUrl===null;
}
/** Registry approval binds every displayed field, including point, licence and caveats. */
export function parseReviewedRegionalStore(row:SourcedStoreRow,registry:readonly ReviewedRegionalStore[]=reviewedRegionalSources):ReviewedRegionalStore|null{
 try{
  if(!object(row.source_metadata))return null;const meta=row.source_metadata,rights=meta.rights;
  if(!object(rights)||rights.factsStorage!==true||rights.publicDisplay!==true||meta.planet!=='hot'||!object(meta.reporting)||meta.reporting.state!=='pending'||row.owner_id!==null||row.archived_at!==null||row.trust_disabled_at!==null||typeof row.owner_penalty_points!=='number'||row.owner_penalty_points>=30||!['DISCOVERED','PUBLISHED'].includes(String(row.publication_state)))return null;
  const expected=registry.find(s=>s.sourceRef===row.source_ref);if(!expected||!validReviewed(expected))return null;
  if(!Array.isArray(meta.menus)||meta.fieldProvenance!==undefined||meta.aliasBindings!==undefined||meta.revokedMenuIds!==undefined)return null;
  const menus=meta.menus.map(m=>{if(!object(m)||m.price!=null||m.priceKrw!=null||m.heat!=null||m.heatLevel!=null||m.image!=null||m.sourceTaste!=null||m.provenance!==undefined)throw Error('unreviewed_regional_menu');return{id:m.id,name:m.name,price:null,heat:null,image:null,sourceTaste:null}});
  const projected={id:row.id,slug:row.slug,sourceRef:row.source_ref,name:row.name,address:row.address,coordinates:{lat:row.lat,lon:row.lon},menus,reportingState:'pending',indexable:true,registrationState:'source-only',ownership:'unclaimed',ownerClaimVerified:false,pinStatus:'gray',operatingStatus:null,currentMenuAvailability:null,source:{url:meta.sourceUrl,licenseName:meta.licenseName,asOf:meta.sourceAsOf,checkedAt:meta.checkedAt,disclosure:meta.disclosure}};
  return sameRegionalFact(projected,expected)?structuredClone(expected):null;
 }catch{return null}
}
/** Quarantine only malformed new rows. Established stores are never removed/relabelled. */
export function appendRegionalSourceStores(base:readonly PublicSourcedStore[],rows:readonly SourcedStoreRow[],registry:readonly ReviewedRegionalStore[]=reviewedRegionalSources){
 const stores=[...base],acceptedRows:SourcedStoreRow[]=[],rejected:string[]=[],ids=new Set(base.map(s=>s.id)),refs=new Set(base.map(s=>s.sourceRef)),slugs=new Set(base.map(s=>s.slug));
 for(const row of rows){const parsed=parseReviewedRegionalStore({...row,owner_id:row?.owner_id??null,archived_at:row?.archived_at??null,trust_disabled_at:row?.trust_disabled_at??null,owner_penalty_points:row?.owner_penalty_points??0,publication_state:row?.publication_state??'DISCOVERED'},registry);if(!parsed||ids.has(parsed.id)||refs.has(parsed.sourceRef)||slugs.has(parsed.slug)){rejected.push(typeof row?.source_ref==='string'?row.source_ref:'invalid_record');continue}stores.push(parsed);acceptedRows.push(row);ids.add(parsed.id);refs.add(parsed.sourceRef);slugs.add(parsed.slug)}
 return{stores,rejected,acceptedRows};
}
