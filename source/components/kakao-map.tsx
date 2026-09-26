'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,LocateFixed,MapPin} from 'lucide-react';
import {isKoreanCoordinate,isKoreanRegion} from '@/lib/korean-region';
import {isValidGeoPoint,type GeoPoint} from '@/lib/nearby-demo';
import {money,type Menu} from '@/lib/menus';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { kakao?:any } }

let kakaoSdkPromise:Promise<any>|null=null;

function loadKakaoSdk(key:string){
 if(window.kakao?.maps?.load)return new Promise<any>((resolve)=>window.kakao.maps.load(()=>resolve(window.kakao)));
 if(kakaoSdkPromise)return kakaoSdkPromise;
 kakaoSdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
  script.async=true;
  script.onload=()=>{
   if(!window.kakao?.maps?.load){kakaoSdkPromise=null;reject(new Error('Kakao Map SDK is unavailable'));return}
   window.kakao.maps.load(()=>resolve(window.kakao));
  };
  script.onerror=()=>{kakaoSdkPromise=null;reject(new Error('Kakao Map SDK load failed'))};
  document.head.appendChild(script);
 });
 return kakaoSdkPromise;
}

type MapVariant='hot'|'rich'|'sweet';
type LocationState='idle'|'locating'|'located'|'denied'|'inaccurate';
type Props={
 menus:Menu[];
 onSelect:(menu:Menu)=>void;
 onPoint?:(point:{address:string;lat:number;lng:number})=>void;
 onLocation?:(point:GeoPoint)=>void;
 fullScreen?:boolean;
 selectedId?:string;
 variant?:MapVariant;
};

export default function KakaoMap({menus,onSelect,onPoint,onLocation,fullScreen=false,selectedId,variant='hot'}:Props){
 const rootRef=useRef<HTMLDivElement>(null);
 const canvasRef=useRef<HTMLDivElement>(null);
 const mapRef=useRef<any>(null);
 const kakaoRef=useRef<any>(null);
 const overlaysRef=useRef<any[]>([]);
 const userMarkerRef=useRef<any>(null);
 const userPointRef=useRef<GeoPoint|null>(null);
 const callbacksRef=useRef({onSelect,onPoint,onLocation});
 callbacksRef.current={onSelect,onPoint,onLocation};
 const [mapState,setMapState]=useState<'loading'|'ready'|'setup'|'error'>('loading');
 const [locationState,setLocationState]=useState<LocationState>('idle');

 const fitNearby=useCallback((point:GeoPoint)=>{
  const map=mapRef.current,k=kakaoRef.current;
  if(!map||!k)return;
  const bounds=new k.maps.LatLngBounds();
  const latitudeDelta=15/111.32;
  const longitudeDelta=15/(111.32*Math.max(.2,Math.cos(point.lat*Math.PI/180)));
  bounds.extend(new k.maps.LatLng(point.lat-latitudeDelta,point.lng-longitudeDelta));
  bounds.extend(new k.maps.LatLng(point.lat+latitudeDelta,point.lng+longitudeDelta));
  map.relayout();
  const mobile=window.matchMedia('(max-width: 700px)').matches;
  const width=canvasRef.current?.clientWidth||0,height=canvasRef.current?.clientHeight||0;
  const bottom=mobile?Math.min(96,Math.max(16,height*.2)):24;
  const left=fullScreen&&!mobile?Math.min(360,Math.max(24,width*.25)):24;
  map.setBounds(bounds,24,24,bottom,left);
 },[fullScreen]);

 const requestLocation=useCallback(()=>{
  // A second tap must recenter even if the device cannot refresh its GPS fix.
  if(userPointRef.current){fitNearby(userPointRef.current);callbacksRef.current.onLocation?.(userPointRef.current)}
  if(!window.isSecureContext||!navigator.geolocation){setLocationState(userPointRef.current?'located':'denied');return}
  setLocationState('locating');
  navigator.geolocation.getCurrentPosition(({coords})=>{
   const point={lat:coords.latitude,lng:coords.longitude};
   if(!isValidGeoPoint(point)||!Number.isFinite(coords.accuracy)||coords.accuracy>5000){setLocationState(userPointRef.current?'located':'inaccurate');return}
   const map=mapRef.current,k=kakaoRef.current;
   if(!map||!k){setLocationState('idle');return}
   userPointRef.current=point;
   const position=new k.maps.LatLng(point.lat,point.lng);
   userMarkerRef.current?.setMap(null);
   userMarkerRef.current=new k.maps.Marker({map,position,title:'내 위치'});
   fitNearby(point);
   setLocationState('located');
   callbacksRef.current.onLocation?.(point);
  },error=>setLocationState(userPointRef.current?'located':error.code===1?'denied':'inaccurate'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 },[fitNearby]);

 useEffect(()=>{
  let cancelled=false;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(entry=>entry.isIntersecting))return;
   observer.disconnect();
   fetch('/api/config',{cache:'no-store'}).then(response=>response.json() as Promise<{kakaoKey?:string}>).then(async config=>{
    if(!config.kakaoKey){setMapState('setup');return}
    timeout=setTimeout(()=>setMapState('error'),10000);
    const k=await loadKakaoSdk(config.kakaoKey);
    if(cancelled||!canvasRef.current)return;
    if(timeout)clearTimeout(timeout);
    kakaoRef.current=k;
    const map=new k.maps.Map(canvasRef.current,{center:new k.maps.LatLng(36.35,127.8),level:fullScreen?12:11});
    mapRef.current=map;
    map.addControl(new k.maps.ZoomControl(),k.maps.ControlPosition.RIGHT);
    if(callbacksRef.current.onPoint)k.maps.event.addListener(map,'click',(event:any)=>{
     const lat=event.latLng.getLat(),lng=event.latLng.getLng();
     if(!isKoreanCoordinate(lat,lng))return;
     new k.maps.services.Geocoder().coord2Address(lng,lat,(result:any,status:any)=>{
      if(status!==k.maps.services.Status.OK||!result?.[0])return;
      const region=result[0].address?.region_1depth_name||result[0].road_address?.region_1depth_name||'';
      if(!isKoreanRegion(region))return;
      callbacksRef.current.onPoint?.({address:result[0].road_address?.address_name||result[0].address?.address_name||'',lat,lng});
     });
    });
    setMapState('ready');
   }).catch(()=>!cancelled&&setMapState('error'));
  },{rootMargin:'200px'});
  if(rootRef.current)observer.observe(rootRef.current);
  return()=>{cancelled=true;if(timeout)clearTimeout(timeout);observer.disconnect()};
 },[fullScreen]);

 useEffect(()=>{
  if(mapState!=='ready'||!mapRef.current||!kakaoRef.current)return;
  const k=kakaoRef.current;
  overlaysRef.current.forEach(overlay=>overlay.setMap(null));
  const groups=new Map<string,Menu[]>();
  menus.filter(menu=>menu.lat!==null&&menu.lng!==null).forEach(menu=>groups.set(menu.placeId,[...(groups.get(menu.placeId)||[]),menu]));
  overlaysRef.current=[...groups.values()].map(group=>{
   const menu=group[0],button=document.createElement('button');
   button.type='button';
   button.className='map-anchor'+(menu.id===selectedId?' selected':'');
   button.textContent=`${menu.isDemo?'[가매장] ':menu.verifiedOwner?'[공식 점주] ':''}${menu.name} · ${money(menu.price)}`;
   button.onclick=()=>callbacksRef.current.onSelect(menu);
   return new k.maps.CustomOverlay({map:mapRef.current,position:new k.maps.LatLng(menu.lat,menu.lng),content:button,yAnchor:1.2});
  });
  if(userPointRef.current)fitNearby(userPointRef.current);
  return()=>overlaysRef.current.forEach(overlay=>overlay.setMap(null));
 },[fitNearby,mapState,menus,selectedId]);

 useEffect(()=>{
  if(mapState!=='ready'||!mapRef.current||!kakaoRef.current)return;
  const menu=menus.find(item=>item.id===selectedId);
  if(menu&&menu.lat!==null&&menu.lng!==null){mapRef.current.setLevel(4);mapRef.current.panTo(new kakaoRef.current.maps.LatLng(menu.lat,menu.lng))}
 },[mapState,menus,selectedId]);

 useEffect(()=>{
  if(mapState!=='ready'||!rootRef.current)return;
  const resize=new ResizeObserver(()=>mapRef.current?.relayout());
  resize.observe(rootRef.current);
  return()=>resize.disconnect();
 },[mapState]);

 const label=variant==='sweet'?'카페 디저트':variant==='rich'?'고소한':'매운';
 const statusText=locationState==='located'?'내 위치 기준 15km':locationState==='locating'?'위치 확인 중':locationState==='denied'?'위치 권한 필요':locationState==='inaccurate'?'정확한 위치 확인 필요':'내 위치 버튼을 눌러 주세요';
 return <div className={fullScreen?'map-panel map-fullscreen':'map-panel'} ref={rootRef}>
  <div className="map-canvas" ref={canvasRef} aria-label={`카카오 대한민국 ${label} 메뉴 지도`}/>
  {mapState!=='ready'&&<div className="map-unavailable"><MapPin size={30} strokeWidth={1.3}/><span className="eyebrow">KAKAO MAP · {variant.toUpperCase()} NOWGO</span><h3>{mapState==='loading'?'지도를 불러오는 중':mapState==='setup'?'지도 연결을 준비하고 있어요':'잠시 지도를 불러올 수 없어요'}</h3><p>메뉴는 목록에서 계속 볼 수 있어요.<br/>실제 매장 상태는 나우고에서 확인하세요.</p><a className="text-link" href="https://www.nowgo.space/" target="_blank" rel="noreferrer">나우고에서 운영 매장 확인 <ArrowUpRight size={18}/></a></div>}
  {mapState==='ready'&&locationState!=='located'&&<div className="map-location-gate" role="status" aria-live="polite"><LocateFixed size={28}/><h3>{locationState==='locating'?'내 위치를 확인하고 있어요':locationState==='idle'?'내 위치에서 찾아볼까요?':'위치를 확인할 수 없어요'}</h3><p>{locationState==='inaccurate'?'기기의 위치 설정을 켜고 다시 시도해 주세요.':locationState==='denied'?'브라우저에서 위치 권한을 허용한 뒤 다시 눌러 주세요.':'내 위치 버튼을 누르면 15km 안의 매장을 보여드려요.'}</p></div>}
  {mapState==='ready'&&<button type="button" className="map-location-button" aria-label="내 위치 기준 15km 지도 보기" onClick={requestLocation} disabled={locationState==='locating'}><LocateFixed size={16}/>{locationState==='locating'?'위치 확인 중':'내 위치 · 15km'}</button>}
  <div className="map-caption"><span>카카오 지도</span><span>{mapState==='ready'?statusText:'지도 연결 확인 중'}</span></div>
 </div>;
}
