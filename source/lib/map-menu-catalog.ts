import type {Menu} from './menus';
import {MAP_RADIUS_KM,menusWithinRadius,isValidGeoPoint,type GeoPoint} from './nearby-demo.ts';

// Real reports already have store coordinates and can appear before GPS permission.
// Demo pins still require verified nearby parcels.
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
 const real=origin?nearby.filter(menu=>!menu.isDemo):catalog.filter(menu=>!menu.isDemo&&menu.lat!==null&&menu.lng!==null&&isValidGeoPoint({lat:menu.lat,lng:menu.lng}));
 return [...previews,...real];
}
