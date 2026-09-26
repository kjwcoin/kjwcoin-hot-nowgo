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

const EARTH_RADIUS_KM=6371.0088;
const toRadians=(degrees:number)=>degrees*Math.PI/180;
const toDegrees=(radians:number)=>radians*180/Math.PI;

// Candidate points are never shown until the map's address service verifies land.
export function demoLandCandidates(origin:GeoPoint):GeoPoint[]{
 if(!isValidGeoPoint(origin))return [];
 return [0.3,0.7,1.5,3,6,9,12,14].flatMap(distance=>
  [0,45,90,135,180,225,270,315].map(bearing=>destination(origin,distance,bearing))
 );
}

export function isValidGeoPoint(input:unknown):input is GeoPoint{
 if(!input||typeof input!=='object')return false;
 const {lat,lng}=input as {lat?:unknown;lng?:unknown};
 return typeof lat==='number'&&Number.isFinite(lat)&&lat>=-90&&lat<=90
  &&typeof lng==='number'&&Number.isFinite(lng)&&lng>=-180&&lng<=180;
}

export function distanceKm(a:GeoPoint,b:GeoPoint):number{
 const lat1=toRadians(a.lat),lat2=toRadians(b.lat);
 const deltaLat=lat2-lat1;
 const deltaLng=toRadians((((b.lng-a.lng)+540)%360+360)%360-180);
 const value=Math.sin(deltaLat/2)**2
  +Math.cos(lat1)*Math.cos(lat2)*Math.sin(deltaLng/2)**2;
 return 2*EARTH_RADIUS_KM*Math.asin(Math.sqrt(Math.min(1,Math.max(0,value))));
}

function destination(origin:GeoPoint,distance:number,bearing:number):GeoPoint{
 const angularDistance=distance/EARTH_RADIUS_KM;
 const bearingRadians=toRadians(bearing);
 const lat1=toRadians(origin.lat),lng1=toRadians(origin.lng);
 const lat2=Math.asin(
  Math.sin(lat1)*Math.cos(angularDistance)
  +Math.cos(lat1)*Math.sin(angularDistance)*Math.cos(bearingRadians)
 );
 const lng2=lng1+Math.atan2(
  Math.sin(bearingRadians)*Math.sin(angularDistance)*Math.cos(lat1),
  Math.cos(angularDistance)-Math.sin(lat1)*Math.sin(lat2)
 );
 const lng=((toDegrees(lng2)+540)%360+360)%360-180;
 return {lat:toDegrees(lat2),lng};
}

export function nearbyDemoMenus(menus:readonly Menu[],origin:GeoPoint|null,landPoints:readonly GeoPoint[]=[]):Menu[]{
 if(!isValidGeoPoint(origin))return menus.filter(menu=>!menu.isDemo);
 const points=landPoints.filter(isValidGeoPoint);
 const positions=new Map<string,GeoPoint>();
 let index=0;
 return menus.flatMap(menu=>{
  if(!menu.isDemo)return [menu];
  let point=positions.get(menu.placeId);
  if(!point){point=points[index++];if(point)positions.set(menu.placeId,point)}
  return point?[{...menu,...point,area:'내 위치 기준 가상 위치'}]:[];
 });
}

export function menusWithinRadius(menus:readonly Menu[],origin:GeoPoint|null,radiusKm=30,landPoints:readonly GeoPoint[]=[]):Menu[]{
 if(!isValidGeoPoint(origin)||!Number.isFinite(radiusKm)||radiusKm<=0)return [];
 return nearbyDemoMenus(menus,origin,landPoints).filter(menu=>
  menu.lat!==null&&menu.lng!==null
  &&isValidGeoPoint({lat:menu.lat,lng:menu.lng})
  &&distanceKm(origin,{lat:menu.lat,lng:menu.lng})<=radiusKm
 );
}
