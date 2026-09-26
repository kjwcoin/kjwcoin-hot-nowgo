'use client';

import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowUpRight,LocateFixed,MapPin} from 'lucide-react';
import {isKoreanCoordinate,isKoreanRegion} from '@/lib/korean-region';
import {demoLandCandidates,hasVerifiedLandParcel,isValidGeoPoint,NEIGHBORHOOD_LEVEL,type GeoPoint} from '@/lib/nearby-demo';
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
 onDemoPositions?:(origin:GeoPoint,points:GeoPoint[])=>void;
 addressSearch?:{text:string;requestId:number}|null;
 onAddressFound?:(point:{address:string;lat:number;lng:number})=>void;
 onAddressError?:()=>void;
 fullScreen?:boolean;
 selectedId?:string;
 variant?:MapVariant;
};

export default function KakaoMap({menus,onSelect,onPoint,onLocation,onDemoPositions,addressSearch,onAddressFound,onAddressError,fullScreen=false,selectedId,variant='hot'}:Props){
 const rootRef=useRef<HTMLDivElement>(null);
 const canvasRef=useRef<HTMLDivElement>(null);
 const mapRef=useRef<any>(null);
 const kakaoRef=useRef<any>(null);
 const overlaysRef=useRef<any[]>([]);
 const userMarkerRef=useRef<any>(null);
 const addressMarkerRef=useRef<any>(null);
 const userPointRef=useRef<GeoPoint|null>(null);
 const callbacksRef=useRef({onSelect,onPoint,onLocation,onDemoPositions,onAddressFound,onAddressError});
 callbacksRef.current={onSelect,onPoint,onLocation,onDemoPositions,onAddressFound,onAddressError};
 const landRequestRef=useRef(0);
 const locationRequestRef=useRef(0);
 const [mapState,setMapState]=useState<'loading'|'ready'|'setup'|'error'>('loading');
 const [locationState,setLocationState]=useState<LocationState>('idle');
 const [locationSource,setLocationSource]=useState<'gps'|'address'>('gps');
 const [manualAddress,setManualAddress]=useState('');
 const [manualError,setManualError]=useState('');

 const focusNeighborhood=useCallback((point:GeoPoint)=>{
  const map=mapRef.current,k=kakaoRef.current;
  if(!map||!k)return;
  map.relayout();
  map.setLevel(NEIGHBORHOOD_LEVEL);
  map.setCenter(new k.maps.LatLng(point.lat,point.lng));
 },[]);

 const showNearby=useCallback((point:GeoPoint,source:'gps'|'address')=>{
   const map=mapRef.current,k=kakaoRef.current;
   if(!map||!k){setLocationState('idle');return}
   userPointRef.current=point;
   const position=new k.maps.LatLng(point.lat,point.lng);
   userMarkerRef.current?.setMap(null);
   userMarkerRef.current=new k.maps.Marker({map,position,title:source==='address'?'선택한 위치':'내 위치'});
   focusNeighborhood(point);
   setLocationSource(source);
   setLocationState('located');
   setManualError('');
   callbacksRef.current.onLocation?.(point);
   if(callbacksRef.current.onDemoPositions){
    const request=++landRequestRef.current;
    const geocoder=new k.maps.services.Geocoder();
    const candidates=demoLandCandidates(point);
    const land:GeoPoint[]=[];
    const check=async()=>{
     for(let index=0;index<candidates.length&&land.length<3;index+=4){
      if(request!==landRequestRef.current)return;
      const batch=candidates.slice(index,index+4);
      const valid=await Promise.all(batch.map(candidate=>new Promise<boolean>(resolve=>{
       geocoder.coord2Address(candidate.lng,candidate.lat,(results:any,status:any)=>{
        const address=results?.[0]?.address;
      resolve(status===k.maps.services.Status.OK&&hasVerifiedLandParcel(address));
       });
      })));
      if(request!==landRequestRef.current)return;
      batch.forEach((candidate,offset)=>{if(valid[offset]&&land.length<3)land.push(candidate)});
     }
     if(request===landRequestRef.current)callbacksRef.current.onDemoPositions?.(point,land);
    };
    void check();
   }
 },[focusNeighborhood]);

 const requestLocation=useCallback(()=>{
  const request=++locationRequestRef.current;
  // A second tap recenters immediately, even if the device cannot refresh its GPS fix.
  if(userPointRef.current){focusNeighborhood(userPointRef.current);callbacksRef.current.onLocation?.(userPointRef.current)}
  if(!window.isSecureContext||!navigator.geolocation){setLocationState(userPointRef.current?'located':'denied');return}
  setLocationState('locating');
  navigator.geolocation.getCurrentPosition(({coords})=>{
   if(request!==locationRequestRef.current)return;
   const point={lat:coords.latitude,lng:coords.longitude};
   if(!isValidGeoPoint(point)||!Number.isFinite(coords.accuracy)||coords.accuracy>5000){setLocationState(userPointRef.current?'located':'inaccurate');return}
   showNearby(point,'gps');
  },error=>{if(request===locationRequestRef.current)setLocationState(userPointRef.current?'located':error.code===1?'denied':'inaccurate')},{enableHighAccuracy:true,timeout:8000,maximumAge:60000});
 },[focusNeighborhood,showNearby]);

 const searchManualLocation=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const k=kakaoRef.current,text=manualAddress.trim();
  if(!k||!text){setManualError('대한민국 주소를 입력해 주세요.');return}
  const request=++locationRequestRef.current;
  new k.maps.services.Geocoder().addressSearch(text,(results:any,status:any)=>{
   if(request!==locationRequestRef.current)return;
   const found=results?.find((result:any)=>isKoreanCoordinate(Number(result.y),Number(result.x)));
   if(status!==k.maps.services.Status.OK||!found){setManualError('주소를 찾지 못했어요. 도로명이나 지번 주소를 입력해 주세요.');return}
   showNearby({lat:Number(found.y),lng:Number(found.x)},'address');
  });
 };

 useEffect(()=>{
  let cancelled=false;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  let locationTimer:ReturnType<typeof setTimeout>|undefined;
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
    // Neutral inland placeholder only while waiting for the visitor's own GPS fix.
    const map=new k.maps.Map(canvasRef.current,{center:new k.maps.LatLng(37.5665,126.978),level:NEIGHBORHOOD_LEVEL});
    mapRef.current=map;
    map.addControl(new k.maps.ZoomControl(),k.maps.ControlPosition.RIGHT);
    if(callbacksRef.current.onPoint)k.maps.event.addListener(map,'click',(event:any)=>{
     const lat=event.latLng.getLat(),lng=event.latLng.getLng();
     if(!isKoreanCoordinate(lat,lng))return;
     new k.maps.services.Geocoder().coord2Address(lng,lat,(result:any,status:any)=>{
      if(status!==k.maps.services.Status.OK||!result?.[0])return;
      const region=result[0].address?.region_1depth_name||result[0].road_address?.region_1depth_name||'';
      if(!isKoreanRegion(region))return;
      addressMarkerRef.current?.setMap(null);
      addressMarkerRef.current=new k.maps.Marker({map,position:new k.maps.LatLng(lat,lng),title:'제보할 가게 주소'});
      callbacksRef.current.onPoint?.({address:result[0].road_address?.address_name||result[0].address?.address_name||'',lat,lng});
     });
    });
    setMapState('ready');
    if(callbacksRef.current.onLocation)locationTimer=setTimeout(()=>{if(!cancelled)requestLocation()},250);
   }).catch(()=>!cancelled&&setMapState('error'));
  },{rootMargin:'200px'});
  if(rootRef.current)observer.observe(rootRef.current);
  return()=>{cancelled=true;if(timeout)clearTimeout(timeout);if(locationTimer)clearTimeout(locationTimer);observer.disconnect()};
 },[fullScreen,requestLocation]);

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
  mapRef.current.relayout();
  return()=>overlaysRef.current.forEach(overlay=>overlay.setMap(null));
 },[mapState,menus,selectedId]);

 useEffect(()=>{
  if(mapState!=='ready'||!mapRef.current||!kakaoRef.current)return;
  const menu=menus.find(item=>item.id===selectedId);
  if(menu&&menu.lat!==null&&menu.lng!==null){mapRef.current.setLevel(4);mapRef.current.panTo(new kakaoRef.current.maps.LatLng(menu.lat,menu.lng))}
 },[mapState,menus,selectedId]);

 useEffect(()=>{
  if(mapState!=='ready'||!mapRef.current||!kakaoRef.current)return;
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
 },[addressSearch,mapState]);

 useEffect(()=>{
  if(mapState!=='ready'||!rootRef.current)return;
  const resize=new ResizeObserver(()=>mapRef.current?.relayout());
  resize.observe(rootRef.current);
  return()=>resize.disconnect();
 },[mapState]);

 const label=variant==='sweet'?'카페 디저트':variant==='rich'?'고소한':'매운';
 const statusText=locationState==='located'?(locationSource==='address'?'선택한 주소 기준 15km':'내 위치 기준 15km'):locationState==='locating'?'위치 확인 중':locationState==='denied'?'위치 권한을 허용하거나 주소를 입력해 주세요':locationState==='inaccurate'?'주소로 위치를 지정할 수 있어요':'내 위치를 확인합니다';
 return <div className={fullScreen?'map-panel map-fullscreen':'map-panel'} ref={rootRef}>
  <div className="map-canvas" ref={canvasRef} aria-label={`카카오 대한민국 ${label} 메뉴 지도`}/>
  {mapState!=='ready'&&<div className="map-unavailable"><MapPin size={30} strokeWidth={1.3}/><span className="eyebrow">KAKAO MAP · {variant.toUpperCase()} NOWGO</span><h3>{mapState==='loading'?'지도를 불러오는 중':mapState==='setup'?'지도 연결을 준비하고 있어요':'잠시 지도를 불러올 수 없어요'}</h3><p>메뉴는 목록에서 계속 볼 수 있어요.<br/>실제 매장 상태는 나우고에서 확인하세요.</p><a className="text-link" href="https://www.nowgo.space/" target="_blank" rel="noreferrer">나우고에서 운영 매장 확인 <ArrowUpRight size={18}/></a></div>}
  {mapState==='ready'&&onLocation&&<button type="button" className="map-location-button" aria-label="내 위치로 이동" onClick={requestLocation}><LocateFixed size={16}/>{locationState==='locating'?'위치 다시 확인':'내 위치'}</button>}
  {mapState==='ready'&&onLocation&&(locationState!=='located'||locationSource==='address')&&<form className="map-manual-location" onSubmit={searchManualLocation}><label htmlFor="map-manual-address">위치 권한이 안 되나요? 주소로 찾기</label><div><input id="map-manual-address" value={manualAddress} onChange={event=>setManualAddress(event.target.value)} placeholder="예: 서울 중구 세종대로 110"/><button type="submit">이 주소 주변 보기</button></div>{manualError&&<small role="alert">{manualError}</small>}</form>}
  <div className="map-caption"><span>카카오 지도</span><span>{mapState==='ready'?statusText:'지도 연결 확인 중'}</span></div>
 </div>;
}
