import {excludedSourceStoreIds,excludedSourceMenuIds} from './readonly-source-reserved-bindings.server.ts';
import records,{reviewed588Records,reviewed591Records,reviewed946Records,reviewed774Records,reviewed785Records,reviewed786Records,reviewed787Records,reviewed791Records,reviewed799Records,reviewed829Records,reviewed893Records,reviewed940Records,reviewed978Records,reviewed1001Records,reviewed1014Records,reviewed1016Records,reviewed1024Records,reviewed1025Records,reviewed1032Records,reviewed1037Records,reviewed1045Records,reviewed1048Records,reviewed1053Records,reviewed1062Records,reviewed1065Records,reviewed1072Records,reviewed1078Records,reviewed1087Records,reviewed1099Records,reviewed1105Records,reviewed1109Records,reviewed1113Records,reviewed1121Records,reviewed1159Records,reviewed1160Records,reviewed1311Records,reviewed1319Records,reviewed1320Records,reviewed1321Records,reviewed1324Records,reviewed1327Records,reviewed1349Records,reviewed1367Records,reviewed1395Records,reviewed1414Records,reviewed1416Records,rejectedRegionalSourceRefs} from './readonly-source-records.ts';
import legacyRecords from '../data/hot-source-listings.json' with {type:'json'};
import {CURRENT_SOURCE_FEED_CONTRACT,REVIEWED1416_SOURCE_FEED_CONTRACT,REVIEWED1414_SOURCE_FEED_CONTRACT,REVIEWED1395_SOURCE_FEED_CONTRACT,REVIEWED1367_SOURCE_FEED_CONTRACT,REVIEWED1349_SOURCE_FEED_CONTRACT,REVIEWED1327_SOURCE_FEED_CONTRACT,REVIEWED1324_SOURCE_FEED_CONTRACT,REVIEWED1321_SOURCE_FEED_CONTRACT,REVIEWED1320_SOURCE_FEED_CONTRACT,REVIEWED1319_SOURCE_FEED_CONTRACT,REVIEWED1311_SOURCE_FEED_CONTRACT,REVIEWED1160_SOURCE_FEED_CONTRACT,REVIEWED1159_SOURCE_FEED_CONTRACT,REVIEWED1121_SOURCE_FEED_CONTRACT,REVIEWED1113_SOURCE_FEED_CONTRACT,REVIEWED1109_SOURCE_FEED_CONTRACT,REVIEWED1105_SOURCE_FEED_CONTRACT,REVIEWED1099_SOURCE_FEED_CONTRACT,REVIEWED1087_SOURCE_FEED_CONTRACT,REVIEWED1078_SOURCE_FEED_CONTRACT,REVIEWED1072_SOURCE_FEED_CONTRACT,REVIEWED1065_SOURCE_FEED_CONTRACT,REVIEWED1062_SOURCE_FEED_CONTRACT,REVIEWED1053_SOURCE_FEED_CONTRACT,REVIEWED1048_SOURCE_FEED_CONTRACT,REVIEWED1045_SOURCE_FEED_CONTRACT,REVIEWED1037_SOURCE_FEED_CONTRACT,REVIEWED1032_SOURCE_FEED_CONTRACT,REVIEWED1025_SOURCE_FEED_CONTRACT,REVIEWED1024_SOURCE_FEED_CONTRACT,REVIEWED1016_SOURCE_FEED_CONTRACT,REVIEWED1014_SOURCE_FEED_CONTRACT,REVIEWED1001_SOURCE_FEED_CONTRACT,REVIEWED978_SOURCE_FEED_CONTRACT,REVIEWED940_SOURCE_FEED_CONTRACT,REVIEWED893_SOURCE_FEED_CONTRACT,REVIEWED829_SOURCE_FEED_CONTRACT,REVIEWED799_SOURCE_FEED_CONTRACT,REVIEWED791_SOURCE_FEED_CONTRACT,REVIEWED787_SOURCE_FEED_CONTRACT,REVIEWED786_SOURCE_FEED_CONTRACT,REVIEWED785_SOURCE_FEED_CONTRACT,REVIEWED774_SOURCE_FEED_CONTRACT,REVIEWED948_SOURCE_FEED_CONTRACT,REVIEWED946_SOURCE_FEED_CONTRACT,MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT,PREVIOUS_SOURCE_FEED_CONTRACT,LEGACY_SOURCE_FEED_CONTRACT,WITHDRAWN_MENU_COMPAT_SOURCE_FEED_CONTRACT,type SourceFeedContract} from './source-feed-contract.ts';
import {publicSourcedStore,type PublicSourcedStoreFeed} from './sourced-store.ts';
/** A versioned public-source listing is not a stores-table registration.
 * No database row, owner claim, operating status or consumer evaluation is implied.
 * Held records are absent from this allowlist. No flag can turn these IDs writable.
 */
export const READONLY_SOURCE_PUBLICATION=true;
// Authorized menu-rights withdrawal review, independent of original SBIZ dates.
const MENU_WITHDRAWAL_REVIEWED_AT='2026-10-13T13:31:00.000Z';
type SourceAliasBinding={sourceRef:string;id:string;menuId:string};
const aliasBindings=records.flatMap(row=>('aliasBindings' in row.source_metadata?row.source_metadata.aliasBindings:[]) as SourceAliasBinding[]);
const reservedIds=new Set([...excludedSourceStoreIds,...records.map(row=>row.id),...aliasBindings.map(alias=>alias.id)].map(id=>id.replace(/-/g,'').toLowerCase()));
// Withdrawing public menu facts never makes a historical source binding writable.
// Withdrawn source-menu identity stays reserved; customer menu-name reports are never relabeled.
const reservedMenuIds=new Set(['chungnam-cheonan-first-001:menu:1',...excludedSourceMenuIds,...records.flatMap(row=>[...row.source_metadata.menus.map(menu=>menu.id),...(row.source_metadata.revokedMenuIds||[])]),...aliasBindings.map(alias=>alias.menuId)]);
/** Match the equivalent UUID text forms PostgreSQL accepts, before any side effect. */
export function isReadonlySourceStoreId(id:unknown):boolean{
 if(typeof id!=='string')return false;
 const value=id.trim();if(!/^\{?[a-f0-9-]+\}?$/i.test(value))return false;
 const normalized=value.replace(/^\{|\}$/g,'').replace(/-/g,'').toLowerCase();
 return /^[a-f0-9]{32}$/.test(normalized)&&reservedIds.has(normalized);
}
/** A receipt is source-bound only when a known manifest identity proves it.
 * Historical unrelated menu IDs are not evidence of a source-store binding.
 * Check each field independently so a missing/forged companion cannot bypass it.
 */
export function isReadonlySourceReportBinding(value:unknown):boolean{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const row=value as Record<string,unknown>;
 return isReadonlySourceStoreId(row.nowgo_store_id)||
  isReadonlySourceStoreId(typeof row.place_id==='string'?row.place_id.trim().replace(/^nowgo-/i,''):null)||
  (typeof row.menu_id==='string'&&reservedMenuIds.has(row.menu_id));
}
export function readonlySourceStoreFeed(contract:SourceFeedContract=CURRENT_SOURCE_FEED_CONTRACT):PublicSourcedStoreFeed{
 const reviewed=contract===CURRENT_SOURCE_FEED_CONTRACT?records:contract===REVIEWED1416_SOURCE_FEED_CONTRACT?reviewed1416Records:contract===REVIEWED1414_SOURCE_FEED_CONTRACT?reviewed1414Records:contract===REVIEWED1395_SOURCE_FEED_CONTRACT?reviewed1395Records:contract===REVIEWED1367_SOURCE_FEED_CONTRACT?reviewed1367Records:contract===REVIEWED1349_SOURCE_FEED_CONTRACT?reviewed1349Records:contract===REVIEWED1327_SOURCE_FEED_CONTRACT?reviewed1327Records:contract===REVIEWED1324_SOURCE_FEED_CONTRACT?reviewed1324Records:contract===REVIEWED1321_SOURCE_FEED_CONTRACT?reviewed1321Records:contract===REVIEWED1320_SOURCE_FEED_CONTRACT?reviewed1320Records:contract===REVIEWED1319_SOURCE_FEED_CONTRACT?reviewed1319Records:contract===REVIEWED1311_SOURCE_FEED_CONTRACT?reviewed1311Records:contract===REVIEWED1160_SOURCE_FEED_CONTRACT?reviewed1160Records:contract===REVIEWED1159_SOURCE_FEED_CONTRACT?reviewed1159Records:contract===REVIEWED1121_SOURCE_FEED_CONTRACT?reviewed1121Records:contract===REVIEWED1113_SOURCE_FEED_CONTRACT?reviewed1113Records:contract===REVIEWED1109_SOURCE_FEED_CONTRACT?reviewed1109Records:contract===REVIEWED1105_SOURCE_FEED_CONTRACT?reviewed1105Records:contract===REVIEWED1099_SOURCE_FEED_CONTRACT?reviewed1099Records:contract===REVIEWED1087_SOURCE_FEED_CONTRACT?reviewed1087Records:contract===REVIEWED1078_SOURCE_FEED_CONTRACT?reviewed1078Records:contract===REVIEWED1072_SOURCE_FEED_CONTRACT?reviewed1072Records:contract===REVIEWED1065_SOURCE_FEED_CONTRACT?reviewed1065Records:contract===REVIEWED1062_SOURCE_FEED_CONTRACT?reviewed1062Records:contract===REVIEWED1053_SOURCE_FEED_CONTRACT?reviewed1053Records:contract===REVIEWED1048_SOURCE_FEED_CONTRACT?reviewed1048Records:contract===REVIEWED1045_SOURCE_FEED_CONTRACT?reviewed1045Records:contract===REVIEWED1037_SOURCE_FEED_CONTRACT?reviewed1037Records:contract===REVIEWED1032_SOURCE_FEED_CONTRACT?reviewed1032Records:contract===REVIEWED1025_SOURCE_FEED_CONTRACT?reviewed1025Records:contract===REVIEWED1024_SOURCE_FEED_CONTRACT?reviewed1024Records:contract===REVIEWED1016_SOURCE_FEED_CONTRACT?reviewed1016Records:contract===REVIEWED1014_SOURCE_FEED_CONTRACT?reviewed1014Records:contract===REVIEWED1001_SOURCE_FEED_CONTRACT?reviewed1001Records:contract===REVIEWED978_SOURCE_FEED_CONTRACT?reviewed978Records:contract===REVIEWED940_SOURCE_FEED_CONTRACT?reviewed940Records:contract===REVIEWED893_SOURCE_FEED_CONTRACT?reviewed893Records:contract===REVIEWED829_SOURCE_FEED_CONTRACT?reviewed829Records:contract===REVIEWED799_SOURCE_FEED_CONTRACT?reviewed799Records:contract===REVIEWED791_SOURCE_FEED_CONTRACT?reviewed791Records:contract===REVIEWED787_SOURCE_FEED_CONTRACT?reviewed787Records:contract===REVIEWED786_SOURCE_FEED_CONTRACT?reviewed786Records:contract===REVIEWED785_SOURCE_FEED_CONTRACT?reviewed785Records:(contract===REVIEWED774_SOURCE_FEED_CONTRACT||contract===REVIEWED948_SOURCE_FEED_CONTRACT)?reviewed774Records:contract===REVIEWED946_SOURCE_FEED_CONTRACT?reviewed946Records:contract===MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT||contract===WITHDRAWN_MENU_COMPAT_SOURCE_FEED_CONTRACT?reviewed591Records:contract===PREVIOUS_SOURCE_FEED_CONTRACT?reviewed588Records:contract===LEGACY_SOURCE_FEED_CONTRACT?legacyRecords:null;
 // Every public contract excludes unpublishable identities. Its reviewed identity
 // set remains explicit; no contract can resurrect menu-less facts from caches.
 const snapshot=reviewed;
 if(!snapshot)throw Error('unsupported_source_feed_contract');
 const seen=new Set<string>();
 const stores=snapshot.map(row=>{
  if(seen.has(row.id))throw Error('duplicate_source_listing');seen.add(row.id);
  const facts=publicSourcedStore({...row,owner_id:null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,publication_state:'DISCOVERED'});
  if(!facts)throw Error('invalid_source_listing');
  return {...facts,indexable:true,registrationState:'source-only' as const};
 });
 // A stable manifest review watermark, not the request time, source data date,
 // current operating verification, or a claim that every record was reviewed then.
 // Empty manifests use the epoch watermark and still revoke all previous facts.
 const reviewTimes=stores.flatMap(store=>[MENU_WITHDRAWAL_REVIEWED_AT,store.source.checkedAt,store.source.fieldProvenance?.registration?.checkedAt,
  store.source.fieldProvenance?.identity?.checkedAt,store.source.fieldProvenance?.coordinates.checkedAt,
  ...store.menus.flatMap(menu=>[menu.sourceTaste?.checkedAt,menu.provenance?.checkedAt])])
  .filter((value):value is string=>Boolean(value));
 const asOf=new Date(reviewTimes.reduce((latest,value)=>Math.max(latest,Date.parse(value)),0)).toISOString();
 return{stores,asOf,complete:contract!==CURRENT_SOURCE_FEED_CONTRACT||rejectedRegionalSourceRefs.length===0};
}
