export const SEARCH_PAGE_SIZE = 60;
/** Use the published address, never infer a location from the store's name. */
export function storeLocality(address:string):string {
 return address.trim().split(/\s+/).slice(0,2).join(' ');
}
export function nearbyPath(region?:string,page=1):string {
 const path=region?`/nearby/${encodeURIComponent(region)}`:'/nearby';
 return page>1?`${path}?page=${page}`:path;
}
