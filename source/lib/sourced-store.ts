import {parseReviewedRegionalStore,reviewedRegionalSources,type RegionalSourceDisclosure} from './regional-source.ts';
import reviewedRegistry from '../data/hot-reviewed-source-registry.json' with {type:'json'};
import {sourceReportingState,type HotReportingState} from './hot-reporting-phase.ts';
/** Public, non-owner facts only. Never convert this into a consumer Report/Menu. */
export type SourceTaste = {description:string;preparationTraits:string[];choiceOffered:boolean;sourceUrl:string;sourceAsOf:string|null;checkedAt:string;licenseName:string;publicDisplayAllowed:true};
export type SourceFieldAttribution = {url:string;asOf:string;checkedAt:string};
export type SourceFieldProvenance = {
  licenseScope:'identity-location-only';
  registration:(SourceFieldAttribution & {nativeRecordId:null})|null;
  identity?:SourceFieldAttribution & {nativeRecordId:string};
  coordinates:SourceFieldAttribution & {nativeRecordId:string};
};
/** The discriminated licence branch describes only exact registry-approved facts. */
type MenuFactProvenanceCommon = {
  sourceUrl:string;sourceRecordIds:Record<string,string>;
  branchMenuApplicability?:null|'source_record_specific_restaurant_not_current_sale';brandName?:string;
  /** Optional exact-reviewed caveat, bound to this menu by the release registry. */
  preparationNotice?:string;
  sourceAsOf:string|null;checkedAt:string;originalName:string;
  nameRepresentation:'original'|'ja-transliteration';currentAvailability:null;priceAsOf:null;
};
/** A bounded individual fact assessment is not an open licence for a tourism website. */
export type MenuFactProvenance = MenuFactProvenanceCommon & ({
  kind:'official-tourism-place-menu'|'official-brand-menu';
  sourceScope?:'brand_common'|'specific_restaurant_official_tourism_record';
  licenseName:null;explicitOpenLicense:false;reuseBasis:'limited-individual-fact-review';
} | {
  kind:'licensed-public-dataset-menu';
  sourceScope:'specific_restaurant_licensed_public_dataset_record';
  licenseName:'공공누리 제1유형 (출처표시)';explicitOpenLicense:true;
  reuseBasis:'kogl-type-1-licensed-dataset-fact';attribution:string;
});
export type SourcedMenu = { id: string; name: string; price: null; heat: null; image: null; sourceTaste?:SourceTaste|null;provenance?:MenuFactProvenance };
export type PublicSourcedStore = {
  id: string; slug: string; sourceRef: string; name: string; address: string;
  coordinates: { lat: number; lon: number } | null;
  menus: SourcedMenu[];
  reportingState: HotReportingState;
  indexable?: boolean;
  registrationState?: 'database'|'source-only';
  ownership: 'unclaimed' | 'verified'; ownerClaimVerified: boolean; pinStatus: 'gray' | 'owner-verified';
  operatingStatus: null; currentMenuAvailability: null;
  source: { url: string; licenseName: string|null; asOf: string | null; checkedAt: string;fieldProvenance?:SourceFieldProvenance;disclosure?:RegionalSourceDisclosure };
};
export type SourcedStoreRow = {
  id: unknown; slug: unknown; name: unknown; address: unknown; owner_id: unknown;
  lat: unknown; lon: unknown; archived_at: unknown; trust_disabled_at: unknown;
  owner_penalty_points: unknown; publication_state: unknown;
  source_ref: unknown; source_metadata: unknown;
};
export const STORE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const nonempty = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const dateOnly=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const timestamp=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const onlyKeys=(row:Record<string,unknown>,keys:readonly string[])=>Object.keys(row).every(key=>keys.includes(key));
const REGISTRATION_URL='https://www.data.go.kr/data/15047498/fileData.do';
const COORDINATE_URL='https://www.data.go.kr/data/15083033/fileData.do';
// Only the reviewed release's compact public facts enter the client bundle. Raw CSV
// locators and legal review records stay in the server-only listing manifest.
type ReviewedSource={id:string;slug:string;name:string;address:string;lat:number;lon:number;fieldProvenance:SourceFieldProvenance;menuKey:string|null};
type ReviewedMenu={name:string;provenance:MenuFactProvenance};
const RELEASE_RECORDS=reviewedRegistry.records as unknown as Record<string,ReviewedSource>;
const RELEASE_MENUS=reviewedRegistry.menus as unknown as Record<string,ReviewedMenu>;
function sameReviewedFact(actual:unknown,expected:unknown):boolean{
 if(actual===expected)return true;
 const a=record(actual),b=record(expected);
 return Boolean(a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(b).every(key=>Object.hasOwn(a,key)&&sameReviewedFact(a[key],b[key])));
}
function releaseMenu(sourceRef:string):ReviewedMenu|undefined{
 const expected=RELEASE_RECORDS[sourceRef];return expected?.menuKey?RELEASE_MENUS[expected.menuKey]:undefined;
}
export const BRAND_COMMON_MENU_NOTICE='브랜드 공통 메뉴 · 지점 판매 여부 미확인';
export function isBrandCommonMenu(menu:Pick<SourcedMenu,'provenance'>):boolean{return menu.provenance?.sourceScope==='brand_common';}

// This review covers exactly two observations, not arbitrary tourism pages or collection.
const REVIEWED_MENU_FACTS:Record<string,{name:string;originalName:string;sourceUrl:string;sourceRecordIds:Record<string,string>;nameRepresentation:MenuFactProvenance['nameRepresentation']}>= {
 'data-go-kr-15083033-MA010120220802577654':{name:'매운묵은지등갈비찜',originalName:'매운묵은지등갈비찜',sourceUrl:'https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=1dffc549-f2dc-4292-b9eb-baf6f031d3ca',sourceRecordIds:{cotid:'1dffc549-f2dc-4292-b9eb-baf6f031d3ca',contentid:'2878004'},nameRepresentation:'original'},
 'data-go-kr-15083033-MA010120220809138248':{name:'스파이시 쉬림프 파스타',originalName:'スパイシーシュリンプパスタ',sourceUrl:'https://japanese.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=190421',sourceRecordIds:{vcontsId:'190421'},nameRepresentation:'ja-transliteration'},
};
function parseFieldProvenance(value:unknown,sourceRef:string,sourceUrl:string,asOf:unknown,checkedAt:string):SourceFieldProvenance|null|undefined{
 if(value===undefined)return null;
 const approved=RELEASE_RECORDS[sourceRef];
 if(approved){
  const expected=approved.fieldProvenance;
  if(!expected.identity||sourceUrl!==COORDINATE_URL||asOf!==expected.identity.asOf||checkedAt!==expected.identity.checkedAt||!sameReviewedFact(value,expected))return undefined;
  return{licenseScope:'identity-location-only',registration:null,identity:{...expected.identity},coordinates:{...expected.coordinates}};
 }
 const row=record(value),registration=record(row?.registration),coordinates=record(row?.coordinates);
 if(!row||!registration||!coordinates||!onlyKeys(row,['licenseScope','registration','coordinates'])||row.licenseScope!=='identity-location-only'||
  !onlyKeys(registration,['url','asOf','checkedAt','nativeRecordId'])||!onlyKeys(coordinates,['url','asOf','checkedAt','nativeRecordId'])||
  sourceUrl!==REGISTRATION_URL||registration.url!==REGISTRATION_URL||registration.asOf!==asOf||registration.checkedAt!==checkedAt||registration.nativeRecordId!==null||
  coordinates.url!==COORDINATE_URL||typeof coordinates.nativeRecordId!=='string'||!/^MA\d{18}$/.test(coordinates.nativeRecordId)||sourceRef!=='data-go-kr-15083033-'+coordinates.nativeRecordId||
  !dateOnly(registration.asOf)||!dateOnly(coordinates.asOf)||!timestamp(registration.checkedAt)||!timestamp(coordinates.checkedAt))return undefined;
 return{licenseScope:'identity-location-only',registration:{url:REGISTRATION_URL,asOf:registration.asOf,checkedAt:registration.checkedAt,nativeRecordId:null},coordinates:{url:COORDINATE_URL,asOf:coordinates.asOf,checkedAt:coordinates.checkedAt,nativeRecordId:coordinates.nativeRecordId}};
}
function parseMenuProvenance(value:unknown,sourceRef:string,name:string):MenuFactProvenance|null|undefined{
 if(value===undefined)return null;
 const approved=releaseMenu(sourceRef);
 if(approved){
  if(name!==approved.name||!sameReviewedFact(value,approved.provenance))return undefined;
  return{...approved.provenance,sourceRecordIds:{...approved.provenance.sourceRecordIds}};
 }
 const row=record(value),expected=REVIEWED_MENU_FACTS[sourceRef],ids=record(row?.sourceRecordIds);
 if(!row||!expected||!ids||!onlyKeys(row,['kind','sourceUrl','sourceRecordIds','sourceAsOf','checkedAt','licenseName','explicitOpenLicense','reuseBasis','originalName','nameRepresentation','currentAvailability','priceAsOf'])||
  row.kind!=='official-tourism-place-menu'||name!==expected.name||row.sourceUrl!==expected.sourceUrl||row.originalName!==expected.originalName||row.nameRepresentation!==expected.nameRepresentation||
  Object.keys(ids).length!==Object.keys(expected.sourceRecordIds).length||Object.entries(expected.sourceRecordIds).some(([key,value])=>ids[key]!==value)||
  row.sourceAsOf!==null||!timestamp(row.checkedAt)||row.licenseName!==null||row.explicitOpenLicense!==false||row.reuseBasis!=='limited-individual-fact-review'||row.currentAvailability!==null||row.priceAsOf!==null)return undefined;
 return{kind:'official-tourism-place-menu',sourceUrl:expected.sourceUrl,sourceRecordIds:{...expected.sourceRecordIds},sourceAsOf:null,checkedAt:row.checkedAt,licenseName:null,explicitOpenLicense:false,reuseBasis:'limited-individual-fact-review',originalName:expected.originalName,nameRepresentation:expected.nameRepresentation,currentAvailability:null,priceAsOf:null};
}
/** Textual source statements are never numeric customer evaluations. */
export function parseSourceTaste(value:unknown,sourceUrl:string,licenseName:string):SourceTaste|null|undefined{
 if(value===undefined||value===null)return null;
 const row=record(value);
 if(!row||!nonempty(row.description,200)||!Array.isArray(row.preparationTraits)||row.preparationTraits.length>4||row.preparationTraits.some(x=>!nonempty(x,40))||new Set(row.preparationTraits).size!==row.preparationTraits.length||typeof row.choiceOffered!=='boolean'||row.publicDisplayAllowed!==true||row.sourceUrl!==sourceUrl||row.licenseName!==licenseName||typeof row.checkedAt!=='string'||!Number.isFinite(Date.parse(row.checkedAt))||!(row.sourceAsOf===null||typeof row.sourceAsOf==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.sourceAsOf)&&Number.isFinite(Date.parse(row.sourceAsOf))&&new Date(row.sourceAsOf).toISOString().slice(0,10)===row.sourceAsOf))return undefined;
 return{description:row.description,preparationTraits:row.preparationTraits as string[],choiceOffered:row.choiceOffered,sourceUrl,sourceAsOf:row.sourceAsOf as string|null,checkedAt:row.checkedAt,licenseName,publicDisplayAllowed:true};
}
export function publicSourcedStore(row: SourcedStoreRow): PublicSourcedStore | null {
  if(typeof row.source_ref==='string'&&!row.source_ref.startsWith('data-go-kr-'))return parseReviewedRegionalStore(row);
  const meta = record(row.source_metadata), rights = record(meta?.rights);
  if (!meta || !rights || rights.publicDisplay !== true || rights.factsStorage !== true ||
    meta.planet !== 'hot' || row.owner_id !== null || row.archived_at !== null || row.trust_disabled_at !== null ||
    typeof row.owner_penalty_points !== 'number' || row.owner_penalty_points >= 30 ||
    !['DISCOVERED', 'NOINDEX', 'PUBLISHED'].includes(String(row.publication_state)) ||
    typeof row.id !== 'string' || !STORE_UUID.test(row.id) ||
    typeof row.source_ref !== 'string' || !/^data-go-kr-(?:\d+-\d+|15083033-MA[0-9A-Z]{18})$/.test(row.source_ref) ||
    typeof row.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || row.slug.length > 80 ||
    !nonempty(row.name, 100) || !nonempty(row.address, 300) || !nonempty(meta.licenseName, 100) ||
    typeof meta.sourceUrl !== 'string' || !/^https:\/\/www\.data\.go\.kr\/data\/\d+\/fileData\.do$/.test(meta.sourceUrl) ||
    typeof meta.checkedAt !== 'string' || !Number.isFinite(Date.parse(meta.checkedAt)) ||
    !(meta.sourceAsOf === null || typeof meta.sourceAsOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meta.sourceAsOf)) ||
    !Array.isArray(meta.menus)) return null;
  const fieldProvenance=parseFieldProvenance(meta.fieldProvenance,row.source_ref,meta.sourceUrl,meta.sourceAsOf,meta.checkedAt);
  const isMixedRights=/^data-go-kr-15083033-MA/.test(row.source_ref);
  const approved=RELEASE_RECORDS[row.source_ref];
  if(fieldProvenance===undefined||isMixedRights!==Boolean(fieldProvenance)||isMixedRights&&(!(REVIEWED_MENU_FACTS[row.source_ref]||approved)||rights.scope!=='identity-location-only'||meta.licenseName!=='이용허락범위 제한 없음'||meta.menus.length!==1))return null;
  if(approved&&(['id','slug','name','address','lat','lon'] as const).some(key=>row[key]!==approved[key]))return null;
  if(approved&&record(meta.reporting)?.state!=='pending')return null;
  const menus: SourcedMenu[] = [], ids = new Set<string>();
  for (const value of meta.menus) {
    const menu = record(value);
    if (!menu || typeof menu.id !== 'string' || !menu.id.startsWith(row.source_ref + ':menu:') ||
      !(/^[a-z0-9:-]{1,120}$/.test(menu.id)||isMixedRights&&menu.id===row.source_ref+':menu:1') || ids.has(menu.id) || !nonempty(menu.name, 100)) return null;
    ids.add(menu.id);
    const sourceTaste=parseSourceTaste(menu.sourceTaste,meta.sourceUrl,meta.licenseName);
    const provenance=parseMenuProvenance(menu.provenance,row.source_ref,menu.name);
    if(sourceTaste===undefined||provenance===undefined||isMixedRights!==Boolean(provenance)||provenance&&sourceTaste)return null;
    // Source descriptions never create a numeric score, price, media asset or vote.
    menus.push({ id: menu.id, name: menu.name, price: null, heat: null, image: null, sourceTaste,...(provenance?{provenance}:{}) });
  }
  if (!menus.length || menus.length > 50) return null;
  const coordinates = typeof row.lat === 'number' && typeof row.lon === 'number' &&
    Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.lat >= 33 && row.lat <= 39.6 && row.lon >= 124 && row.lon <= 132
      ? { lat: row.lat, lon: row.lon } : null;
  return {
    id: row.id, slug: row.slug, sourceRef: row.source_ref, name: row.name, address: row.address,
    coordinates, menus, reportingState: sourceReportingState(row.source_metadata), indexable: row.publication_state==='DISCOVERED'||row.publication_state==='PUBLISHED', ownership: 'unclaimed', ownerClaimVerified: false, pinStatus: 'gray', operatingStatus: null,
    currentMenuAvailability: null,
    source: { url: meta.sourceUrl, licenseName: meta.licenseName, asOf: meta.sourceAsOf as string | null, checkedAt: meta.checkedAt,...(fieldProvenance?{fieldProvenance}:{}) },
  };
}
export function sourcedStoreClaimPath(storeId: string) {
  if (!STORE_UUID.test(storeId)) throw Error('invalid_store');
  return `/owner/claim?storeId=${encodeURIComponent(storeId)}`;
}
export type OwnerInformationRequestState = { count: number; requested: boolean; ownerRegistered: boolean };
export function parseOwnerInformationRequestState(value: unknown): OwnerInformationRequestState {
  const row = record(value);
  if (!row || typeof row.count !== 'number' || !Number.isSafeInteger(row.count) || row.count < 0 ||
    typeof row.requested !== 'boolean' || typeof row.ownerRegistered !== 'boolean') throw Error('invalid_request_state');
  return { count: row.count, requested: row.requested, ownerRegistered: row.ownerRegistered };
}

export type PublicSourcedStoreFeed={stores:PublicSourcedStore[];asOf:string;complete:boolean};
/** This shape gate alone does not prove a feed came from the immutable manifest. */
export function isSourceOnlyFeed(feed:PublicSourcedStoreFeed|null):feed is PublicSourcedStoreFeed{
 return Boolean(feed&&feed.stores.every(store=>store.registrationState==='source-only'&&
  store.ownerClaimVerified===false&&store.ownership==='unclaimed'&&store.pinStatus==='gray'));
}
/** Validate and whitelist every item on both sides of the public feed boundary. */
export function parseSourcedStoreFeed(value:unknown):PublicSourcedStoreFeed{
 const feed=record(value);
 if(!feed||!Array.isArray(feed.stores)||feed.stores.length>5000||typeof feed.complete!=='boolean'||
  typeof feed.asOf!=='string'||!Number.isFinite(Date.parse(feed.asOf)))throw Error('invalid_source_feed');
 const stores=new Map<string,PublicSourcedStore>(),slugs=new Set<string>(),refs=new Set<string>();
 for(const value of feed.stores){
  const item=record(value),source=record(item?.source),coordinates=record(item?.coordinates);
  if(!item||!source||(item.registrationState!==undefined&&!['database','source-only'].includes(String(item.registrationState)))||(item.registrationState==='source-only'&&item.ownerClaimVerified!==false)||(item.indexable!==undefined&&typeof item.indexable!=='boolean')||!((item.ownership==='unclaimed'&&item.ownerClaimVerified===false&&item.pinStatus==='gray')||(item.ownership==='verified'&&item.ownerClaimVerified===true&&item.pinStatus==='owner-verified'))||item.operatingStatus!==null||item.currentMenuAvailability!==null||
   !Array.isArray(item.menus)||item.menus.some(value=>{const menu=record(value);return !menu||menu.price!==null||menu.heat!==null||menu.image!==null})||
   !(item.coordinates===null||coordinates&&typeof coordinates.lat==='number'&&typeof coordinates.lon==='number'&&
    Number.isFinite(coordinates.lat)&&Number.isFinite(coordinates.lon)&&coordinates.lat>=33&&coordinates.lat<=39.6&&coordinates.lon>=124&&coordinates.lon<=132))throw Error('invalid_source_store');
  if(typeof item.sourceRef==='string'&&(RELEASE_RECORDS[item.sourceRef]||reviewedRegionalSources.some(s=>s.sourceRef===item.sourceRef))&&(item.registrationState!=='source-only'||reviewedRegionalSources.some(s=>s.sourceRef===item.sourceRef)&&item.indexable!==true||item.ownerClaimVerified!==false||item.ownership!=='unclaimed'||item.pinStatus!=='gray'))throw Error('invalid_source_store');
  const facts=publicSourcedStore({id:item.id,slug:item.slug,name:item.name,address:item.address,owner_id:null,
   lat:coordinates?.lat??null,lon:coordinates?.lon??null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,
   publication_state:'DISCOVERED',source_ref:item.sourceRef,source_metadata:{planet:'hot',rights:{publicDisplay:true,factsStorage:true,...(source.fieldProvenance?{scope:'identity-location-only'}:{})},
    reporting:{state:item.reportingState},licenseName:source.licenseName,sourceUrl:source.url,sourceAsOf:source.asOf,checkedAt:source.checkedAt,fieldProvenance:source.fieldProvenance,disclosure:source.disclosure,menus:item.menus}});
  if(!facts)throw Error('invalid_source_store');
  const store:PublicSourcedStore={...facts,indexable:item.indexable===true,...(item.registrationState==='source-only'?{registrationState:'source-only' as const}:{}),ownership:item.ownership as PublicSourcedStore['ownership'],ownerClaimVerified:item.ownerClaimVerified as boolean,pinStatus:item.pinStatus as PublicSourcedStore['pinStatus']};
  const previous=stores.get(store.id);
  if(previous){if(JSON.stringify(previous)!==JSON.stringify(store))throw Error('conflicting_source_store');continue}
  if(slugs.has(store.slug)||refs.has(store.sourceRef))throw Error('conflicting_source_store');
  stores.set(store.id,store);slugs.add(store.slug);refs.add(store.sourceRef);
 }
 return {stores:[...stores.values()],asOf:feed.asOf,complete:feed.complete};
}
export function sourcedStoreUrl(store:Pick<PublicSourcedStore,'slug'>):string{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store.slug)||store.slug.length>80)throw Error('invalid_source_slug');
 return 'https://hot.nowgo.space/p/'+encodeURIComponent(store.slug);
}
