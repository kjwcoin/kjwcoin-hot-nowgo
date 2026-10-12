import {sourceReportingState,type HotReportingState} from './hot-reporting-phase.ts';
/** Public, non-owner facts only. Never convert this into a consumer Report/Menu. */
export type SourcedMenu = { id: string; name: string; price: null; heat: null; image: null };
export type PublicSourcedStore = {
  id: string; slug: string; sourceRef: string; name: string; address: string;
  coordinates: { lat: number; lon: number } | null;
  menus: SourcedMenu[];
  reportingState: HotReportingState;
  ownership: 'unclaimed' | 'verified'; ownerClaimVerified: boolean; pinStatus: 'gray' | 'owner-verified';
  operatingStatus: null; currentMenuAvailability: null;
  source: { url: string; licenseName: string; asOf: string | null; checkedAt: string };
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
export function publicSourcedStore(row: SourcedStoreRow): PublicSourcedStore | null {
  const meta = record(row.source_metadata), rights = record(meta?.rights);
  if (!meta || !rights || rights.publicDisplay !== true || rights.factsStorage !== true ||
    meta.planet !== 'hot' || row.owner_id !== null || row.archived_at !== null || row.trust_disabled_at !== null ||
    typeof row.owner_penalty_points !== 'number' || row.owner_penalty_points >= 30 ||
    !['DISCOVERED', 'NOINDEX', 'PUBLISHED'].includes(String(row.publication_state)) ||
    typeof row.id !== 'string' || !STORE_UUID.test(row.id) ||
    typeof row.source_ref !== 'string' || !/^data-go-kr-\d+-\d+$/.test(row.source_ref) ||
    typeof row.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || row.slug.length > 80 ||
    !nonempty(row.name, 100) || !nonempty(row.address, 300) || !nonempty(meta.licenseName, 100) ||
    typeof meta.sourceUrl !== 'string' || !/^https:\/\/www\.data\.go\.kr\/data\/\d+\/fileData\.do$/.test(meta.sourceUrl) ||
    typeof meta.checkedAt !== 'string' || !Number.isFinite(Date.parse(meta.checkedAt)) ||
    !(meta.sourceAsOf === null || typeof meta.sourceAsOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meta.sourceAsOf)) ||
    !Array.isArray(meta.menus)) return null;
  const menus: SourcedMenu[] = [], ids = new Set<string>();
  for (const value of meta.menus) {
    const menu = record(value);
    if (!menu || typeof menu.id !== 'string' || !menu.id.startsWith(row.source_ref + ':menu:') ||
      !/^[a-z0-9:-]{1,120}$/.test(menu.id) || ids.has(menu.id) || !nonempty(menu.name, 100)) return null;
    ids.add(menu.id);
    // Unknown price/heat/media stay unknown, regardless of untrusted metadata extras.
    menus.push({ id: menu.id, name: menu.name, price: null, heat: null, image: null });
  }
  if (!menus.length || menus.length > 50) return null;
  const coordinates = typeof row.lat === 'number' && typeof row.lon === 'number' &&
    Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.lat >= 33 && row.lat <= 39.6 && row.lon >= 124 && row.lon <= 132
      ? { lat: row.lat, lon: row.lon } : null;
  return {
    id: row.id, slug: row.slug, sourceRef: row.source_ref, name: row.name, address: row.address,
    coordinates, menus, reportingState: sourceReportingState(row.source_metadata), ownership: 'unclaimed', ownerClaimVerified: false, pinStatus: 'gray', operatingStatus: null,
    currentMenuAvailability: null,
    source: { url: meta.sourceUrl, licenseName: meta.licenseName, asOf: meta.sourceAsOf as string | null, checkedAt: meta.checkedAt },
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
/** Validate and whitelist every item on both sides of the public feed boundary. */
export function parseSourcedStoreFeed(value:unknown):PublicSourcedStoreFeed{
 const feed=record(value);
 if(!feed||!Array.isArray(feed.stores)||feed.stores.length>5000||typeof feed.complete!=='boolean'||
  typeof feed.asOf!=='string'||!Number.isFinite(Date.parse(feed.asOf)))throw Error('invalid_source_feed');
 const stores=new Map<string,PublicSourcedStore>(),slugs=new Set<string>(),refs=new Set<string>();
 for(const value of feed.stores){
  const item=record(value),source=record(item?.source),coordinates=record(item?.coordinates);
  if(!item||!source||!((item.ownership==='unclaimed'&&item.ownerClaimVerified===false&&item.pinStatus==='gray')||(item.ownership==='verified'&&item.ownerClaimVerified===true&&item.pinStatus==='owner-verified'))||item.operatingStatus!==null||item.currentMenuAvailability!==null||
   !Array.isArray(item.menus)||item.menus.some(value=>{const menu=record(value);return !menu||menu.price!==null||menu.heat!==null||menu.image!==null})||
   !(item.coordinates===null||coordinates&&typeof coordinates.lat==='number'&&typeof coordinates.lon==='number'&&
    Number.isFinite(coordinates.lat)&&Number.isFinite(coordinates.lon)&&coordinates.lat>=33&&coordinates.lat<=39.6&&coordinates.lon>=124&&coordinates.lon<=132))throw Error('invalid_source_store');
  const facts=publicSourcedStore({id:item.id,slug:item.slug,name:item.name,address:item.address,owner_id:null,
   lat:coordinates?.lat??null,lon:coordinates?.lon??null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,
   publication_state:'DISCOVERED',source_ref:item.sourceRef,source_metadata:{planet:'hot',rights:{publicDisplay:true,factsStorage:true},
    reporting:{state:item.reportingState},licenseName:source.licenseName,sourceUrl:source.url,sourceAsOf:source.asOf,checkedAt:source.checkedAt,menus:item.menus}});
  if(!facts)throw Error('invalid_source_store');
  const store:PublicSourcedStore={...facts,ownership:item.ownership as PublicSourcedStore['ownership'],ownerClaimVerified:item.ownerClaimVerified as boolean,pinStatus:item.pinStatus as PublicSourcedStore['pinStatus']};
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
