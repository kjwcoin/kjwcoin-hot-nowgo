import type {Menu} from './menus';
import {distanceKm,MAP_RADIUS_KM,isValidGeoPoint,type GeoPoint} from './nearby-demo.ts';
export function mapMenuCatalog(catalog:readonly Menu[],origin:GeoPoint|null,_landPoints:readonly GeoPoint[]=[]):Menu[]{return catalog.filter(menu=>!menu.isDemo&&menu.lat!==null&&menu.lng!==null&&isValidGeoPoint({lat:menu.lat,lng:menu.lng})&&(!origin||distanceKm(origin,{lat:menu.lat,lng:menu.lng})<=MAP_RADIUS_KM))}
