import type {Menu} from './menus';

export type GeoPoint=Readonly<{lat:number;lng:number}>;

const EARTH_RADIUS_KM=6371.0088;
const DISTANCES_KM=[3,6,9] as const;
const BEARINGS_DEGREES=[40,165,285] as const;
const toRadians=(degrees:number)=>degrees*Math.PI/180;
const toDegrees=(radians:number)=>radians*180/Math.PI;

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

function placementFor(placeId:string){
 let slot=0,jitter=0;
 for(let index=0;index<placeId.length;index++){
  const code=placeId.charCodeAt(index);
  slot=(slot+code)%DISTANCES_KM.length;
  jitter=(jitter+(index+1)*code)%21;
 }
 return {distance:DISTANCES_KM[slot],bearing:BEARINGS_DEGREES[slot]+jitter-10};
}

export function nearbyDemoMenus(menus:readonly Menu[],origin:GeoPoint|null):Menu[]{
 if(!isValidGeoPoint(origin))return menus.slice();
 const positions=new Map<string,GeoPoint>();
 return menus.map(menu=>{
  if(!menu.isDemo)return menu;
  let point=positions.get(menu.placeId);
  if(!point){
   const placement=placementFor(menu.placeId);
   point=destination(origin,placement.distance,placement.bearing);
   positions.set(menu.placeId,point);
  }
  return {...menu,...point,area:'내 위치 기준 가상 위치'};
 });
}

export function menusWithinRadius(menus:readonly Menu[],origin:GeoPoint|null,radiusKm=30):Menu[]{
 if(!isValidGeoPoint(origin)||!Number.isFinite(radiusKm)||radiusKm<=0)return [];
 return nearbyDemoMenus(menus,origin).filter(menu=>
  menu.lat!==null&&menu.lng!==null
  &&isValidGeoPoint({lat:menu.lat,lng:menu.lng})
  &&distanceKm(origin,{lat:menu.lat,lng:menu.lng})<=radiusKm
 );
}
