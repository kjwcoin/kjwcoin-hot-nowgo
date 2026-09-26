'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,LocateFixed,MapPin} from 'lucide-react';
import {type Menu,money} from '@/lib/menus';
import {isKoreanCoordinate,isKoreanRegion} from '@/lib/korean-region';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
 interface Window { kakao?: any }
}

let kakaoSdkPromise:Promise<any>|null=null;

function loadKakaoSdk(key:string){
 if(typeof window==='undefined')return Promise.reject(new Error('browser only'));
 if(window.kakao?.maps?.load){
  return new Promise<any>((resolve,reject)=>{
   try{window.kakao.maps.load(()=>resolve(window.kakao));}catch(e){reject(e)}
  });
 }
 if(kakaoSdkPromise)return kakaoSdkPromise;
 kakaoSdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
  script.async=true;
  script.onload=()=>{
   if(!window.kakao?.maps?.load){
    kakaoSdkPromise=null;
    reject(new Error('Kakao Map SDK is unavailable'));
    return;
   }
   try{window.kakao.maps.load(()=>resolve(window.kakao));}
   catch(e){kakaoSdkPromise=null;reject(e)}
  };
  script.onerror=()=>{
   kakaoSdkPromise=null;
   reject(new Error('Kakao Map SDK load failed'));
  };
  document.head.appendChild(script);
 });
 return kakaoSdkPromise;
}

type Point={lat:number;lng:number};

type Props={
 menus:Menu[];
 onSelect:(menu:Menu)=>void;
 onPoint?:(point:{address:string;lat:number;lng:number})=>void;
 addressSearch?:{text:string;requestId:number}|null;
 onAddressFound?:(point:{address:string;lat:number;lng:number})=>void;
 onAddressError?:()=>void;
 onLocation?:(point:Point)=>void;
 fullScreen?:boolean;
 selectedId?:string;
};

export default function KakaoMap({menus,onSelect,onPoint,onLocation,addressSearch,onAddressFound,onAddressError,fullScreen=false,selectedId}:Props){
 const rootRef=useRef<HTMLDivElement>(null);
 const canvasRef=useRef<HTMLDivElement>(null);
 const mapRef=useRef<any>(null);
 const kakaoRef=useRef<any>(null);
 const overlaysRef=useRef<any[]>([]);
 const userMarkerRef=useRef<any>(null);
 const addressMarkerRef=useRef<any>(null);
 const callbacksRef=useRef({onSelect,onPoint,onLocation,onAddressFound,onAddressError});
 callbacksRef.current={onSelect,onPoint,onLocation,onAddressFound,onAddressError};

 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 const [locationState,setLocationState]=useState<'idle'|'locating'|'located'|'denied'>('idle');

 const moveToCurrentLocation=useCallback((requestPermission=true)=>{
  if(typeof navigator==='undefined'||!navigator.geolocation){
   setLocationState('denied');
   return;
  }
  if(requestPermission)setLocationState('locating');
  navigator.geolocation.getCurrentPosition(
   ({coords})=>{
    const point={lat:coords.latitude,lng:coords.longitude};
    if(!isKoreanCoordinate(point.lat,point.lng)){
     setLocationState('denied');
     return;
    }
    const k=kakaoRef.current;
    const map=mapRef.current;
    if(!k||!map)return;
    const pos=new k.maps.LatLng(point.lat,point.lng);
    map.setLevel(6);
    map.panTo(pos);
    if(userMarkerRef.current)userMarkerRef.current.setMap(null);
    userMarkerRef.current=new k.maps.Marker({map,position:pos,title:'내 위치'});
    setLocationState('located');
    callbacksRef.current.onLocation?.(point);
   },
   ()=>setLocationState(requestPermission?'denied':'idle'),
   {enableHighAccuracy:true,timeout:8000,maximumAge:60000}
  );
 },[]);

 useEffect(()=>{
  let cancelled=false;
  let observer:IntersectionObserver|undefined;
  const start=async()=>{
   try{
    const config=await fetch('/api/config',{cache:'no-store'}).then(r=>{
     if(!r.ok)throw new Error('config failed');
     return r.json() as Promise<{kakaoKey?:string}>;
    });
    if(!config.kakaoKey)throw new Error('Kakao JavaScript key is missing');
    const k=await loadKakaoSdk(config.kakaoKey);
    if(cancelled||!canvasRef.current)return;
    kakaoRef.current=k;
    const map=new k.maps.Map(canvasRef.current,{
     center:new k.maps.LatLng(36.35,127.8),
     level:fullScreen?13:11
    });
    mapRef.current=map;
    map.addControl(new k.maps.ZoomControl(),k.maps.ControlPosition.RIGHT);
    if(callbacksRef.current.onPoint){
     k.maps.event.addListener(map,'click',(event:any)=>{
      const lat=event.latLng.getLat();
      const lng=event.latLng.getLng();
      if(!isKoreanCoordinate(lat,lng))return;
      const geocoder=new k.maps.services.Geocoder();
      geocoder.coord2Address(lng,lat,(result:any,status:any)=>{
       if(status!==k.maps.services.Status.OK||!result?.[0])return;
       const region=result[0].address?.region_1depth_name||result[0].road_address?.region_1depth_name||'';
       if(!isKoreanRegion(region))return;
       const address=result[0].road_address?.address_name||result[0].address?.address_name||'';
       addressMarkerRef.current?.setMap(null);
       addressMarkerRef.current=new k.maps.Marker({map,position:new k.maps.LatLng(lat,lng),title:'제보할 가게 주소'});
       callbacksRef.current.onPoint?.({address,lat,lng});
      });
     });
    }
    setState('ready');
    window.setTimeout(()=>moveToCurrentLocation(false),250);
   }catch{
    if(!cancelled)setState('error');
   }
  };
  observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    observer?.disconnect();
    void start();
   }
  },{rootMargin:'200px'});
  if(rootRef.current)observer.observe(rootRef.current);
  return()=>{
   cancelled=true;
   observer?.disconnect();
   overlaysRef.current.forEach(overlay=>overlay.setMap(null));
   userMarkerRef.current?.setMap(null);
  };
 },[fullScreen,moveToCurrentLocation]);

 useEffect(()=>{
  if(state!=='ready'||!mapRef.current||!kakaoRef.current)return;
  const k=kakaoRef.current;
  overlaysRef.current.forEach(overlay=>overlay.setMap(null));
  const grouped=new Map<string,Menu[]>();
  menus.forEach(menu=>{
   if(menu.lat===null||menu.lng===null)return;
   grouped.set(menu.placeId,[...(grouped.get(menu.placeId)||[]),menu]);
  });
  overlaysRef.current=[...grouped.values()].map(group=>{
   const menu=group[0];
   const button=document.createElement('button');
   button.type='button';
   button.className='map-anchor'+(menu.id===selectedId?' selected':'');
   button.textContent=`${menu.isDemo?'[가매장] ':menu.verifiedOwner?'[공식 점주] ':''}${menu.name} · ${money(menu.price)}`;
   button.onclick=()=>callbacksRef.current.onSelect(menu);
   return new k.maps.CustomOverlay({
    map:mapRef.current,
    position:new k.maps.LatLng(menu.lat,menu.lng),
    content:button,
    yAnchor:1.2
   });
  });
  return()=>overlaysRef.current.forEach(overlay=>overlay.setMap(null));
 },[menus,selectedId,state]);

 useEffect(()=>{
  if(state!=='ready'||!mapRef.current||!kakaoRef.current)return;
  const menu=menus.find(item=>item.id===selectedId);
  if(menu?.lat===null||menu?.lng===null||!menu)return;
  mapRef.current.setLevel(5);
  mapRef.current.panTo(new kakaoRef.current.maps.LatLng(menu.lat,menu.lng));
 },[menus,selectedId,state]);

 useEffect(()=>{
  if(state!=='ready'||!mapRef.current||!kakaoRef.current)return;
  if(!addressSearch?.text){addressMarkerRef.current?.setMap(null);return}
  let cancelled=false;
  const k=kakaoRef.current;
  new k.maps.services.Geocoder().addressSearch(addressSearch.text,(results:any,status:any)=>{
   if(cancelled)return;
   const found=results?.find((item:any)=>isKoreanCoordinate(Number(item.y),Number(item.x)));
   if(status!==k.maps.services.Status.OK||!found){callbacksRef.current.onAddressError?.();return}
   const lat=Number(found.y),lng=Number(found.x);
   const position=new k.maps.LatLng(lat,lng);
   addressMarkerRef.current?.setMap(null);
   addressMarkerRef.current=new k.maps.Marker({map:mapRef.current,position,title:'제보할 가게 주소'});
   mapRef.current.setLevel(4);
   mapRef.current.panTo(position);
   callbacksRef.current.onAddressFound?.({address:found.address_name,lat,lng});
  });
  return()=>{cancelled=true};
 },[addressSearch,state]);

 useEffect(()=>{
  if(state!=='ready'||!rootRef.current)return;
  const resize=new ResizeObserver(()=>mapRef.current?.relayout());
  resize.observe(rootRef.current);
  return()=>resize.disconnect();
 },[state]);

 return <div className={fullScreen?'map-panel map-fullscreen':'map-panel'} ref={rootRef}>
  <div className="map-canvas" ref={canvasRef} aria-label="카카오 대한민국 카페 디저트 지도"/>
  {state==='loading'&&<div className="map-unavailable">
   <MapPin size={30} strokeWidth={1.3}/>
   <span className="eyebrow">KAKAO MAP · SWEET NOWGO</span>
   <h3>카카오맵을 불러오는 중</h3>
   <p>대한민국 전국의 카페·디저트 메뉴를 준비하고 있어요.</p>
  </div>}
  {state==='error'&&<div className="map-unavailable">
   <MapPin size={30} strokeWidth={1.3}/>
   <span className="eyebrow">KAKAO MAP · SWEET NOWGO</span>
   <h3>카카오맵 연결 설정이 필요해요</h3>
   <p>카카오 Developers에서 지도 사용 설정과 JavaScript SDK 도메인을 확인해 주세요.</p>
   <a className="text-link" href="https://developers.kakao.com/" target="_blank" rel="noreferrer">카카오 Developers 열기 <ArrowUpRight size={18}/></a>
  </div>}
  {state==='ready'&&<button
   type="button"
   className="map-location-button"
   aria-label="내 위치로 이동"
   onClick={()=>moveToCurrentLocation(true)}
  >
   <LocateFixed size={16}/>
   {locationState==='locating'?'위치 확인 중':locationState==='located'?'내 위치':'내 위치'}
  </button>}
  <div className="map-caption">
   <span>{state==='ready'?'카카오맵':'SWEET 지도'}</span>
   <span>{state==='ready'?(locationState==='located'?'내 위치 기준 · 주변 메뉴':'내 위치 버튼으로 주변 메뉴 찾기'):'카카오맵 연결을 확인하는 중'}</span>
  </div>
 </div>;
}
