import {MAP_RADIUS_KM,type GeoPoint} from './nearby-demo.ts';
/** HOT map exploration follows the map, while location still controls centering. */
export function mapBrowseOrigin(variant:string,location:GeoPoint|null):GeoPoint|null{
 return variant==='hot'?null:location;
}
/** Preserve the existing radius contract for SWEET/RICH only. */
export function appendMapBrowseLocation(params:URLSearchParams,variant:string,location:GeoPoint|null):void{
 const origin=mapBrowseOrigin(variant,location);
 if(origin){params.set('lat',String(origin.lat));params.set('lng',String(origin.lng));params.set('radiusKm',String(MAP_RADIUS_KM))}
}
