import type {Menu} from './menus';
import {isKoreanRegion} from './korean-region.ts';

export type GeoPoint=Readonly<{lat:number;lng:number}>;
export const MAP_RADIUS_KM=15;
export const NEIGHBORHOOD_LEVEL=5;

export function hasVerifiedLandParcel(input:unknown):boolean{
 if(!input||typeof input!=='object')return false;
 const address=input as {address_name?:unknown;main_address_no?:unknown;region_1depth_name?:unknown};
 return typeof address.address_name==='string'&&address.address_name.length>0
  &&typeof address.main_address_no==='string'&&/^\d+$/.test(address.main_address_no)
  &&typeof address.region_1depth_name==='string'&&isKoreanRegion(address.region_1depth_name);
}
const radians=(degrees:number)=>degrees*Math.PI/180;
const degrees=(rad:number)=>rad*180/Math.PI;
const earth=6371.0088;

export function isValidGeoPoint(point:GeoPoint){return Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&point.lat>=-90&&point.lat<=90&&point.lng>=-180&&point.lng<=180}
export function distanceKm(a:GeoPoint,b:GeoPoint){
 const lat=radians(b.lat-a.lat),lng=radians(b.lng-a.lng);
 const h=Math.sin(lat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(lng/2)**2;
 return 2*earth*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
export function demoLandCandidates(origin:GeoPoint):GeoPoint[]{
 if(!isValidGeoPoint(origin))return [];
 const latitude=radians(origin.lat),longitude=radians(origin.lng);
 return [0.3,0.7,1.5,3,6,9,12,14].flatMap(distance=>
  [0,45,90,135,180,225,270,315].map(bearing=>{
   const arc=distance/earth,angle=radians(bearing);
   const lat=Math.asin(Math.sin(latitude)*Math.cos(arc)+Math.cos(latitude)*Math.sin(arc)*Math.cos(angle));
   const lng=longitude+Math.atan2(Math.sin(angle)*Math.sin(arc)*Math.cos(latitude),Math.cos(arc)-Math.sin(latitude)*Math.sin(lat));
   return {lat:degrees(lat),lng:((degrees(lng)+540)%360+360)%360-180};
  })
 );
}
export function menusWithinRadius(menus:readonly Menu[],origin:GeoPoint|null,land:readonly GeoPoint[]):Menu[]{
 if(!origin||!isValidGeoPoint(origin))return [];
 const valid=land.filter(point=>isValidGeoPoint(point)&&distanceKm(origin,point)<=MAP_RADIUS_KM).slice(0,3);
 const positions=new Map<string,GeoPoint>();
 let index=0;
 return menus.flatMap(menu=>{
  if(!menu.isDemo){return menu.lat!==null&&menu.lng!==null&&distanceKm(origin,{lat:menu.lat,lng:menu.lng})<=MAP_RADIUS_KM?[menu]:[]}
  let place=positions.get(menu.placeId);
  if(!place){place=valid[index++];if(place)positions.set(menu.placeId,place)}
  return place?[{...menu,...place,area:'내 위치 기준 가상 위치'}]:[];
 });
}
