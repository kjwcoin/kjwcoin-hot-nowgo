import {excludedSourceStoreIds,excludedSourceMenuIds} from './readonly-source-reserved-bindings.server.ts';
import records,{reviewed588Records,reviewed591Records,reviewed946Records,reviewed774Records,reviewed785Records,reviewed786Records,reviewed787Records,rejectedRegionalSourceRefs} from './readonly-source-records.ts';
import legacyRecords from '../data/hot-source-listings.json' with {type:'json'};
import {CURRENT_SOURCE_FEED_CONTRACT,REVIEWED787_SOURCE_FEED_CONTRACT,REVIEWED786_SOURCE_FEED_CONTRACT,REVIEWED785_SOURCE_FEED_CONTRACT,REVIEWED774_SOURCE_FEED_CONTRACT,REVIEWED948_SOURCE_FEED_CONTRACT,REVIEWED946_SOURCE_FEED_CONTRACT,MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT,PREVIOUS_SOURCE_FEED_CONTRACT,LEGACY_SOURCE_FEED_CONTRACT,WITHDRAWN_MENU_COMPAT_SOURCE_FEED_CONTRACT,type SourceFeedContract} from './source-feed-contract.ts';
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
const reservedMenuIds=new Set([...excludedSourceMenuIds,...records.flatMap(row=>[...row.source_metadata.menus.map(menu=>menu.id),...(row.source_metadata.revokedMenuIds||[])]),...aliasBindings.map(alias=>alias.menuId)]);
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
 const reviewed=contract===CURRENT_SOURCE_FEED_CONTRACT?records:contract===REVIEWED787_SOURCE_FEED_CONTRACT?reviewed787Records:contract===REVIEWED786_SOURCE_FEED_CONTRACT?reviewed786Records:contract===REVIEWED785_SOURCE_FEED_CONTRACT?reviewed785Records:(contract===REVIEWED774_SOURCE_FEED_CONTRACT||contract===REVIEWED948_SOURCE_FEED_CONTRACT)?reviewed774Records:contract===REVIEWED946_SOURCE_FEED_CONTRACT?reviewed946Records:contract===MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT||contract===WITHDRAWN_MENU_COMPAT_SOURCE_FEED_CONTRACT?reviewed591Records:contract===PREVIOUS_SOURCE_FEED_CONTRACT?reviewed588Records:contract===LEGACY_SOURCE_FEED_CONTRACT?legacyRecords:null;
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
