import records from '../data/hot-source-listings.json' with {type:'json'};
import {publicSourcedStore,type PublicSourcedStoreFeed} from './sourced-store.ts';
/** A versioned public-source listing is not a stores-table registration.
 * No database row, owner claim, operating status or consumer evaluation is implied.
 * Held records are absent from this allowlist. No flag can turn these IDs writable.
 */
export const READONLY_SOURCE_PUBLICATION=true;
type SourceAliasBinding={sourceRef:string;id:string;menuId:string};
const aliasBindings=records.flatMap(row=>('aliasBindings' in row.source_metadata?row.source_metadata.aliasBindings:[]) as SourceAliasBinding[]);
const reservedIds=new Set([...records.map(row=>row.id),...aliasBindings.map(alias=>alias.id)].map(id=>id.replace(/-/g,'').toLowerCase()));
const reservedMenuIds=new Set([...records.flatMap(row=>row.source_metadata.menus.map(menu=>menu.id)),...aliasBindings.map(alias=>alias.menuId)]);
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
export function readonlySourceStoreFeed():PublicSourcedStoreFeed{
 const seen=new Set<string>();
 const stores=records.map(row=>{
  if(seen.has(row.id))throw Error('duplicate_source_listing');seen.add(row.id);
  const facts=publicSourcedStore({...row,owner_id:null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,publication_state:'DISCOVERED'});
  if(!facts)throw Error('invalid_source_listing');
  return {...facts,indexable:true,registrationState:'source-only' as const};
 });
 return{stores,asOf:new Date().toISOString(),complete:true};
}
