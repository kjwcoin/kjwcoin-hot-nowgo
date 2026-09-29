import type {Menu} from './menus';
import {MAP_RADIUS_KM,menusWithinRadius,type GeoPoint} from './nearby-demo.ts';

// Preview information does not depend on GPS or the map provider. Only verified
// nearby coordinates may produce map pins or a directions link.
export function mapMenuCatalog(catalog:readonly Menu[],origin:GeoPoint|null,landPoints:readonly GeoPoint[]=[]):Menu[]{
 const nearby=menusWithinRadius([...catalog],origin,MAP_RADIUS_KM,landPoints);
 const locatedDemos=new Map(nearby.filter(menu=>menu.isDemo).map(menu=>[menu.id,menu]));
 const places=new Set<string>();
 const previews:Menu[]=[];
 for(const menu of catalog){
  if(!menu.isDemo||places.has(menu.placeId)||places.size===3)continue;
  places.add(menu.placeId);
  previews.push(locatedDemos.get(menu.id)||{...menu,lat:null,lng:null,area:'가매장 예시 · 지도 위치 미확인'});
 }
 return [...previews,...nearby.filter(menu=>!menu.isDemo)];
}
