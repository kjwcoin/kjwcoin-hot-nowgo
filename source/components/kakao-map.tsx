'use client';

import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowUpRight,LocateFixed,MapPin} from 'lucide-react';
import {type Menu,money} from '@/lib/menus';
import {isKoreanCoordinate,isKoreanRegion} from '@/lib/korean-region';
import {demoLandCandidates,hasVerifiedLandParcel,isValidGeoPoint,MAP_RADIUS_KM,NEIGHBORHOOD_LEVEL,type GeoPoint} from '@/lib/nearby-demo';

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

type Props={
 menus:Menu[];
 onSelect:(menu:Menu)=>void;
 onPoint?:(point:{address:string;lat:number;lng:number})=>void;
 addressSearch?:{text:string;requestId:number}|null;
 onAddressFound?:(point:{address:string;lat:number;lng:number})=>void;
 onAddressError?:()=>void;
 onLocation?:(point:GeoPoint)=>void;
 onDemoPositions?:(origin:GeoPoint,points:GeoPoint[])=>void;
 fullScreen?:boolean;
 selectedId?:string;
};

export default function KakaoMap({menus,onSelect,onPoint,onLocation,onDemoPositions,addressSearch,onAddressFound,onAddressError,fullScreen=false,selectedId}:Props){
 const rootRef=useRef<HTMLDivElement>(null);
 const canvasRef=useRef<HTMLDivElement>(null);
 const manualInputRef=useRef<HTMLInputElement>(null);
 const mapRef=useRef<any>(null);
 const kakaoRef=useRef<any>(null);
 const overlaysRef=useRef<any[]>([]);
 const userMarkerRef=useRef<any>(null);
 const addressMarkerRef=useRef<any>(null);
 const callbacksRef=useRef({onSelect,onPoint,onLocation,onDemoPositions,onAddressFound,onAddressError});
 callbacksRef.current={onSelect,onPoint,onLocation,onDemoPositions,onAddressFound,onAddressError};
 const landRequestRef=useRef(0),locationRequestRef=useRef(0);
 const userPointRef=useRef<GeoPoint|null>(null);

 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 const [locationState,setLocationState]=useState<'idle'|'locating'|'located'|'denied'>('idle');
 const [locationSource,setLocationSource]=useState<'gps'|'address'>('gps');
 const [manualAddress,setManualAddress]=useState('');
 const [manualError,setManualError]=useState('');

 const showNearby=useCallback((point:GeoPoint,source:'gps'|'address')=>{
  const k=kakaoRef.current,map=mapRef.current;
  if(!k||!map)return;
  userPointRef.current=point;
  const position=new k.maps.LatLng(point.lat,point.lng);
  map.relayout();
  map.setLevel(NEIGHBORHOOD_LEVEL);
  map.setCenter(position);
  userMarkerRef.current?.setMap(null);
  userMarkerRef.current=new k.maps.Marker({map,position,title:source==='gps'?'내 위치':'선택한 주소'});
  setLocationState('located');
  setLocationSource(source);
  setManualError('');
  callbacksRef.current.onLocation?.(point);
  const request=++landRequestRef.current,geocoder=new k.maps.services.Geocoder();
  const candidates=demoLandCandidates(point),land:GeoPoint[]=[];
  const check=async()=>{
   for(let index=0;index<candidates.length&&land.length<3;index+=4){
    if(request!==landRequestRef.current)return;
    const batch=candidates.slice(index,index+4);
    const verified=await Promise.all(batch.map(candidate=>new Promise<boolean>(resolve=>{
     geocoder.coord2Address(candidate.lng,candidate.lat,(results:any,status:any)=>{
      const address=results?.[0]?.address;
      resolve(status===k.maps.services.Status.OK&&hasVerifiedLandParcel(address));
     });
    })));
    if(request!==landRequestRef.current)return;
    batch.forEach((candidate,index)=>{if(verified[index]&&land.length<3)land.push(candidate)});
   }
   if(request===landRequestRef.current)callbacksRef.current.onDemoPositions?.(point,land);
  };
  void check();
 },[]);

 const moveToCurrentLocation=useCallback(()=>{
  const request=++locationRequestRef.current;
  if(userPointRef.current){
   const map=mapRef.current,k=kakaoRef.current;
   map?.setLevel(NEIGHBORHOOD_LEVEL);
   if(map&&k)map.setCenter(new k.maps.LatLng(userPointRef.current.lat,userPointRef.current.lng));
  }
  if(!window.isSecureContext||!navigator.geolocation){setLocationState(userPointRef.current?'located':'denied');return}
  setLocationState('locating');
  navigator.geolocation.getCurrentPosition(
   ({coords})=>{
    if(request!==locationRequestRef.current)return;
    const point={lat:coords.latitude,lng:coords.longitude};
    if(!isKoreanCoordinate(point.lat,point.lng)||!isValidGeoPoint(point)||!Number.isFinite(coords.accuracy)||coords.accuracy>5000){setLocationState(userPointRef.current?'located':'denied');return}
    showNearby(point,'gps');
   },
   ()=>{if(request===locationRequestRef.current)setLocationState(userPointRef.current?'located':'denied')},
   {enableHighAccuracy:true,timeout:8000,maximumAge:60000}
  );
 },[showNearby]);

 const searchManualLocation=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const k=kakaoRef.current,text=manualAddress.trim();
  if(!k||!text){setManualError('대한민국 주소를 입력해 주세요.');return}
  const request=++locationRequestRef.current;
  new k.maps.services.Geocoder().addressSearch(text,(results:any,status:any)=>{
   if(request!==locationRequestRef.current)return;
   const found=results?.find((item:any)=>isKoreanCoordinate(Number(item.y),Number(item.x)));
   if(status!==k.maps.services.Status.OK||!found){setManualError('주소를 찾지 못했어요. 도로명이나 지번 주소를 입력해 주세요.');return}
   showNearby({lat:Number(found.y),lng:Number(found.x)},'address');
  });
 };

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
     center:new k.maps.LatLng(37.5665,126.978),
     level:NEIGHBORHOOD_LEVEL
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
 },[fullScreen]);

 useEffect(()=>{if(locationState==='denied')manualInputRef.current?.focus()},[locationState]);

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
  <div className="map-canvas" ref={canvasRef} aria-label="카카오 대한민국 느끼한 맛 지도"/>
  {state==='loading'&&<div className="map-unavailable">
   <MapPin size={30} strokeWidth={1.3}/>
   <span className="eyebrow">KAKAO MAP · RICH NOWGO</span>
   <h3>카카오맵을 불러오는 중</h3>
   <p>대한민국 전국의 느끼한 맛 메뉴를 준비하고 있어요.</p>
  </div>}
  {state==='error'&&<div className="map-unavailable">
   <MapPin size={30} strokeWidth={1.3}/>
   <span className="eyebrow">KAKAO MAP · RICH NOWGO</span>
   <h3>카카오맵 연결 설정이 필요해요</h3>
   <p>카카오 Developers에서 지도 사용 설정과 JavaScript SDK 도메인을 확인해 주세요.</p>
   <a className="text-link" href="https://developers.kakao.com/" target="_blank" rel="noreferrer">카카오 Developers 열기 <ArrowUpRight size={18}/></a>
  </div>}
  {state==='ready'&&<button
   type="button"
   className="map-location-button"
   aria-label="내 위치로 이동"
   onClick={moveToCurrentLocation}
  >
   <LocateFixed size={16}/>
   {locationState==='locating'?'위치 확인 중':'내 위치'}
  </button>}
  {state==='ready'&&onLocation&&(locationState==='denied'||locationSource==='address'&&locationState==='located')&&<form className="map-manual-location" onSubmit={searchManualLocation}><label htmlFor="map-manual-address">위치 권한이 안 되나요? 주소로 찾기</label><div><input ref={manualInputRef} id="map-manual-address" value={manualAddress} onChange={event=>setManualAddress(event.target.value)} placeholder="예: 서울 중구 세종대로 110"/><button type="submit">이 주소 주변 보기</button></div>{manualError&&<small role="alert">{manualError}</small>}</form>}
  <div className="map-caption">
   <span>{state==='ready'?'카카오맵':'RICH 지도'}</span>
   <span>{state==='ready'?(locationState==='located'?(locationSource==='address'?'선택한 주소':'내 위치')+` 기준 ${MAP_RADIUS_KM}km`:locationState==='denied'?'위치 권한이 꺼져 있어요. 주소로 찾을 수 있어요':'내 위치를 눌러 주변 15km 보기'):'카카오맵 연결을 확인하는 중'}</span>
  </div>
 </div>;
}
