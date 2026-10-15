/** Offline, non-mutating validation only. Does not publish or authorize an import. */
import {storeIdentity} from './menu-store-groups.ts';
import {isKoreanCoordinate} from './korean-region.ts';

export const MAX_INITIAL_HOT_VENUES=4000;
export type HotImportCandidate={
 recordId:string;shop:string;address:string;region:string;countryCode:string;
 lat:number|null;lng:number|null;
 menu:{name:string;spicyEvidence:{kind:'explicit_menu_text'|'verified_spice_icon';text:string;reviewed:boolean}};
 provenance:{sourceKind:'official_dataset'|'owner_submission'|'independent_license'|'naver_search';sourceUrl:string;sourceRecordId:string;checkedAt:string;sourceAsOf?:string|null};
 rights:{licenseName:string;referenceUrl:string;factsStorage:boolean;publicDisplay:boolean;commercialUse:boolean;reviewedAt:string};
};
export type ImportRejection={recordId:string;reason:'invalid_record'|'prohibited_api_import'|'missing_provenance'|'missing_rights'|'missing_menu_evidence'|'outside_korea'|'invalid_coordinates'|'capacity'};
export type HotPreviewVenue={
 identity:string;shop:string;address:string;region:string;countryCode:'KR';lat:number|null;lng:number|null;
 ownerClaimVerified:false;verifiedOwner:false;pinStatus:'gray';currentOperationVerified:false;freshness:'source_date_only'|'unknown';status:'ready_for_review'|'needs_coordinates';
 evidence:HotImportCandidate[];
};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max=500):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const https=(value:unknown)=>{if(!text(value,2000))return false;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port}catch{return false}};
const checked=(value:unknown,now:number)=>text(value,100)&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now;
function rejection(raw:unknown,now:number):ImportRejection['reason']|null{
 if(!record(raw)||!text(raw.recordId,200)||!text(raw.shop,200)||!text(raw.address,500)||!text(raw.region,100))return 'invalid_record';
 if(raw.countryCode!=='KR')return 'outside_korea';
 const p=raw.provenance,r=raw.rights,m=raw.menu;
 if(record(p)&&p.sourceKind==='naver_search')return 'prohibited_api_import';
 if(!record(p)||!['official_dataset','owner_submission','independent_license'].includes(String(p.sourceKind))||!https(p.sourceUrl)||!text(p.sourceRecordId,300)||!checked(p.checkedAt,now))return 'missing_provenance';
 if(p.sourceAsOf!=null&&!checked(p.sourceAsOf,now))return 'missing_provenance';
 if(!record(r)||!text(r.licenseName,300)||!https(r.referenceUrl)||r.factsStorage!==true||r.publicDisplay!==true||r.commercialUse!==true||!checked(r.reviewedAt,now))return 'missing_rights';
 if(!record(m)||!text(m.name,200)||!record(m.spicyEvidence)||!['explicit_menu_text','verified_spice_icon'].includes(String(m.spicyEvidence.kind))||!text(m.spicyEvidence.text,1500)||m.spicyEvidence.reviewed!==true)return 'missing_menu_evidence';
 if(m.spicyEvidence.kind==='explicit_menu_text'&&!/매운|매콤|얼큰|칼칼|\bspicy\b/iu.test(m.spicyEvidence.text))return 'missing_menu_evidence';
 const noCoordinates=raw.lat===null&&raw.lng===null;
 if(!noCoordinates&&(typeof raw.lat!=='number'||typeof raw.lng!=='number'||!isKoreanCoordinate(raw.lat,raw.lng)))return 'invalid_coordinates';
 return null;
}
export function previewHotImport(input:unknown,{now=Date.now(),limit=MAX_INITIAL_HOT_VENUES}:{now?:number;limit?:number}={}){
 if(!Array.isArray(input))throw new TypeError('Expected a JSON array of independently sourced menu candidates');
 if(!Number.isFinite(now))throw new RangeError('Invalid review time');
 if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_INITIAL_HOT_VENUES)throw new RangeError('Unique venue limit must be between 1 and 4000');
 const venues=new Map<string,HotPreviewVenue>(),rejected:ImportRejection[]=[],seen=new Set<string>();let repeatedEvidence=0;
 for(const raw of input){
  const recordId=record(raw)&&typeof raw.recordId==='string'?raw.recordId:'(missing)';
  const reason=rejection(raw,now);if(reason){rejected.push({recordId,reason});continue}
  const item=raw as HotImportCandidate;
  const identity=storeIdentity(item.shop,item.address)!;
  // Evidence identity includes its source and exact venue; colliding external IDs do not drop another store.
  const evidenceKey=JSON.stringify([identity,item.provenance.sourceUrl,item.provenance.sourceRecordId,item.recordId]);
  if(seen.has(evidenceKey)){repeatedEvidence++;continue}
  let venue=venues.get(identity);
  if(!venue){
   if(venues.size>=limit){rejected.push({recordId,reason:'capacity'});continue}
   venue={identity,shop:item.shop,address:item.address,region:item.region,countryCode:'KR',lat:item.lat,lng:item.lng,ownerClaimVerified:false,verifiedOwner:false,pinStatus:'gray',currentOperationVerified:false,freshness:item.provenance.sourceAsOf?'source_date_only':'unknown',status:item.lat===null?'needs_coordinates':'ready_for_review',evidence:[]};
   venues.set(identity,venue);
  }
  if(venue.lat===null&&item.lat!==null){venue.lat=item.lat;venue.lng=item.lng;venue.status='ready_for_review'}
  seen.add(evidenceKey);venue.evidence.push(item);
 }
 const entries=[...venues.values()];
 return {mode:'dry_run' as const,limit,inputRecords:input.length,uniqueVenues:entries.length,evidenceRecords:entries.reduce((sum,venue)=>sum+venue.evidence.length,0),repeatedEvidence,readyForReview:entries.filter(venue=>venue.status==='ready_for_review').length,needsCoordinates:entries.filter(venue=>venue.status==='needs_coordinates').length,imported:0,published:0,venues:entries,rejected};
}
