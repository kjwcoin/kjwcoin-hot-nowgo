import type {StoreMapDisplay} from './map-store-clusters.ts';
import type {ViewportBounds} from './viewport-count-client.ts';
/** Count the same real, distinct stores represented by the mounted pin/cluster layer.
 * Null bounds cannot support an on-screen assertion, even when fallback pins render.
 */
export function loadedMapStoreCount(displays:readonly StoreMapDisplay[],bounds:ViewportBounds|null):number|null{
 if(!bounds)return null;
 const {south,north,west,east}=bounds;
 if(![south,north,west,east].every(Number.isFinite)||south>=north||west>=east)return null;
 const keys=new Set<string>();
 for(const display of displays)for(const point of display.kind!=='store'?display.members:[display.point]){
  if(point.isDemo||!Number.isFinite(point.lat)||!Number.isFinite(point.lng))continue;
  if(point.lat>=south&&point.lat<=north&&point.lng>=west&&point.lng<=east)keys.add(point.key);
 }
 return keys.size;
}
export function loadedMapCountLabel(count:number|null):string{
 return count===null?'표시 매장 수를 확인하지 못했어요':`현재 화면 표시 매장 ${count.toLocaleString('ko-KR')}곳`;
}
