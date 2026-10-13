import records from '../data/hot-collected-blog-stores-20261014.json' with {type:'json'};
import type {PublicSourcedStore,SourcedStoreRow} from './sourced-store.ts';
type CollectedRecord={id:string;slug:string;sourceRef:string;name:string;address:string;sourceAddress:string;coordinates:{lat:number;lon:number}|null;menu:string;sourceUrl:string;sourceAsOf:string|null;collectedAt:string;coordinateUrl:string|null};
const entries=records as CollectedRecord[];
const byRef=new Map(entries.map(row=>[row.sourceRef,row]));
if(byRef.size!==entries.length||new Set(entries.map(row=>row.id)).size!==entries.length)throw Error('duplicate_collected_blog_store');
export const collectedBlogStoreIds=entries.map(row=>row.id);
export const collectedBlogMenuIds=entries.map(row=>row.sourceRef+':menu:1');
/** Exact release facts only. A URL prefix never establishes eligibility or ownership. */
export function publicCollectedBlogStore(row:SourcedStoreRow):PublicSourcedStore|null{
 const expected=byRef.get(String(row.source_ref));
 if(!expected||row.id!==expected.id||row.slug!==expected.slug||row.name!==expected.name||row.address!==expected.address||row.lat!==(expected.coordinates?.lat??null)||row.lon!==(expected.coordinates?.lon??null)||row.owner_id!==null||row.archived_at!==null||row.trust_disabled_at!==null||row.owner_penalty_points!==0)return null;
 const meta=row.source_metadata as Record<string,unknown>|null;
 if(!meta||meta.sourceUrl!==expected.sourceUrl||meta.sourceAsOf!==expected.sourceAsOf||meta.checkedAt!==expected.collectedAt||!Array.isArray(meta.menus)||meta.menus.length!==1)return null;
 const menu=meta.menus[0] as Record<string,unknown>;
 if(menu.id!==expected.sourceRef+':menu:1'||menu.name!==expected.menu)return null;
 return collectedBlogStore(expected);
}
function collectedBlogStore(row:CollectedRecord):PublicSourcedStore{
 return {id:row.id,slug:row.slug,sourceRef:row.sourceRef,name:row.name,address:row.address,coordinates:row.coordinates,
 menus:[{id:row.sourceRef+':menu:1',name:row.menu,price:null,heat:null,image:null}],reportingState:'pending',indexable:false,registrationState:'source-only',
 ownership:'unclaimed',ownerClaimVerified:false,pinStatus:'gray',markerColor:'red',operatingStatus:null,currentMenuAvailability:null,
 source:{url:row.sourceUrl,licenseName:'상호·주소·메뉴명 사실 정보 · 블로그 출처',asOf:row.sourceAsOf,checkedAt:row.collectedAt,...(row.coordinateUrl?{coordinateUrl:row.coordinateUrl}:{})}};
}
export const collectedBlogStores=entries.map(collectedBlogStore);
