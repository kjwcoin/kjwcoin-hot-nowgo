'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,LocateFixed,MapPin} from 'lucide-react';
import {isKoreanCoordinate,isKoreanRegion} from '@/lib/korean-region';
import {isValidGeoPoint,NEIGHBORHOOD_LEVEL,type GeoPoint} from '@/lib/nearby-demo';
import {resolveDemoLand,type DemoLocationState} from '@/lib/resolve-demo-land';
import {money,type Menu} from '@/lib/menus';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { kakao?:any } }

let kakaoSdkPromise:Promise<any>|null=null;

function loadKakaoSdk(key:string){
 if(kakaoSdkPromise)return kakaoSdkPromise;
 kakaoSdkPromise=new Promise((resolve,reject)=>{
  let script:HTMLScriptElement|undefined;
  const timer=setTimeout(()=>{script?.remove();reject(new Error('Kakao Map SDK timed out'))},10000);
  const ready=()=>{
   if(!window.kakao?.maps?.load){clearTimeout(timer);reject(new Error('Kakao Map SDK is unavailable'));return}
   window.kakao.maps.load(()=>{clearTimeout(timer);resolve(window.kakao)});
  };
  if(window.kakao?.maps?.load){ready();return}
  script=document.createElement('script');
  script.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
  script.async=true;
  script.onload=ready;
  script.onerror=()=>{clearTimeout(timer);script?.remove();reject(new Error('Kakao Map SDK load failed'))};
  document.head.appendChild(script);
 }).catch(error=>{kakaoSdkPromise=null;throw error});
 return kakaoSdkPromise;
}

type MapVariant='hot'|'rich'|'sweet';
type LocationState='idle'|'locating'|'located'|'denied'|'inaccurate'|'outside';
type Props={
 menus:Menu[];
 onSelect:(menu:Menu)=>void;
 onPoint?:(point:{address:string;lat:number;lng:number})=>void;
 onLocation?:(point:GeoPoint)=>void;
 onDemoPositions?:(origin:GeoPoint,points:GeoPoint[],state:DemoLocationState)=>void;
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
 const [tileFailed,setTileFailed]=useState(false);
 const [mapAttempt,setMapAttempt]=useState(0);
 const [locationState,setLocationState]=useState<LocationState>('idle');

 const focusNeighborhood=useCallback((point:GeoPoint)=>{
  const map=mapRef.current,k=kakaoRef.current;
  if(!map||!k)return;
  map.relayout();
  map.setLevel(NEIGHBORHOOD_LEVEL);
  map.setCenter(new k.maps.LatLng(point.lat,point.lng));
 },[]);

 const showNearby=useCallback((point:GeoPoint)=>{
   const map=mapRef.current,k=kakaoRef.current;
   if(!map||!k){setLocationState('idle');return}
   userPointRef.current=point;
   const position=new k.maps.LatLng(point.lat,point.lng);
   userMarkerRef.current?.setMap(null);
   userMarkerRef.current=new k.maps.Marker({map,position,title:'내 위치'});
   focusNeighborhood(point);
   setLocationState('located');
   callbacksRef.current.onLocation?.(point);
   if(callbacksRef.current.onDemoPositions){
    const request=++landRequestRef.current;
    const geocoder=new k.maps.services.Geocoder();
    callbacksRef.current.onDemoPositions?.(point,[],'loading');
    void resolveDemoLand(point,geocoder,{isCurrent:()=>request===landRequestRef.current}).then(({points,state})=>{
     if(request===landRequestRef.current)callbacksRef.current.onDemoPositions?.(point,points,state);
    });
   }
 },[focusNeighborhood]);

 const requestLocation=useCallback(()=>{
  const request=++locationRequestRef.current;
  // A second tap recenters immediately, even if the device cannot refresh its GPS fix.
  if(userPointRef.current)showNearby(userPointRef.current)
  if(!window.isSecureContext||!navigator.geolocation){setLocationState(userPointRef.current?'located':'denied');return}
  setLocationState('locating');
  navigator.geolocation.getCurrentPosition(({coords})=>{
   if(request!==locationRequestRef.current)return;
   const point={lat:coords.latitude,lng:coords.longitude};
   if(!isValidGeoPoint(point)||!Number.isFinite(coords.accuracy)||coords.accuracy>5000){setLocationState(userPointRef.current?'located':'inaccurate');return}
   if(!isKoreanCoordinate(point.lat,point.lng)){setLocationState('outside');return}
   showNearby(point);
  },error=>{if(request===locationRequestRef.current)setLocationState(userPointRef.current?'located':error.code===1?'denied':'inaccurate')},{enableHighAccuracy:true,timeout:8000,maximumAge:60000});
 },[focusNeighborhood,showNearby]);

 useEffect(()=>{
  let cancelled=false;
  const controller=new AbortController();
  let configTimeout:ReturnType<typeof setTimeout>|undefined;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(entry=>entry.isIntersecting))return;
   observer.disconnect();
   configTimeout=setTimeout(()=>controller.abort(),8000);
   fetch('/api/config',{cache:'no-store',signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('Map configuration unavailable');return response.json() as Promise<{kakaoKey?:string}>}).then(async config=>{
    clearTimeout(configTimeout);
    if(cancelled)return;
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
    if(userPointRef.current)showNearby(userPointRef.current);
    else if(fullScreen&&callbacksRef.current.onLocation&&navigator.permissions){
     void navigator.permissions.query({name:'geolocation'}).then(permission=>{
      if(!cancelled&&permission.state==='granted')requestLocation();
     }).catch(()=>{});
    }
   }).catch(()=>!cancelled&&setMapState('error'));
  },{rootMargin:'200px'});
  if(rootRef.current)observer.observe(rootRef.current);
  return()=>{cancelled=true;controller.abort();clearTimeout(configTimeout);if(timeout)clearTimeout(timeout);observer.disconnect();landRequestRef.current++;locationRequestRef.current++;overlaysRef.current.forEach(overlay=>overlay.setMap(null));userMarkerRef.current?.setMap(null);addressMarkerRef.current?.setMap(null);mapRef.current=null};
 },[fullScreen,mapAttempt,requestLocation,showNearby]);

 useEffect(()=>{
  if(mapState!=='ready'||!mapRef.current||!kakaoRef.current)return;
  const k=kakaoRef.current;
  overlaysRef.current.forEach(overlay=>overlay.setMap(null));
  const groups=new Map<string,Menu[]>();
  menus.filter(menu=>menu.lat!==null&&menu.lng!==null).forEach(menu=>groups.set(menu.placeId,[...(groups.get(menu.placeId)||[]),menu]));
  overlaysRef.current=[...groups.values()].map(group=>{
   const menu=group[0],button=document.createElement('button');
   button.type='button';
   button.className='map-anchor map-anchor--food'+(menu.id===selectedId?' selected':'');
   button.setAttribute('aria-label',`${menu.isDemo?'가매장 ':menu.verifiedOwner?'공식 점주 ':''}${menu.shop}, ${menu.name}, ${money(menu.price)}. 메뉴 상세 보기`);
   button.title=`${menu.shop} · ${menu.name}`;
   const pin=document.createElement('span');
   pin.className='map-anchor-pin';
   pin.setAttribute('aria-hidden','true');
   const level=Math.min(5,Math.max(1,Math.trunc(menu.heat)||1));
   pin.style.backgroundPosition=`${(level-1)*25}% ${variant==='sweet'?50:variant==='rich'?100:0}%`;
   const price=document.createElement('span');
   price.className='map-anchor-price';
   price.textContent=money(menu.price);
   button.append(pin,price);
   button.onclick=()=>callbacksRef.current.onSelect(menu);
   return new k.maps.CustomOverlay({map:mapRef.current,position:new k.maps.LatLng(menu.lat,menu.lng),content:button,yAnchor:1.2});
  });
  mapRef.current.relayout();
  return()=>overlaysRef.current.forEach(overlay=>overlay.setMap(null));
 },[mapState,menus,selectedId,variant]);

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

 useEffect(()=>{
  const canvas=canvasRef.current;
  if(!canvas)return;
  const failed=new Set<string>();
  const tile=(event:Event)=>{
   const img=event.target;
   if(!(img instanceof HTMLImageElement)||!/(?:map_2d|map_skyview|map_hybrid)\//.test(img.src))return;
   if(event.type==='error')failed.add(img.src);else failed.delete(img.src);
   setTileFailed(failed.size>0);
  };
  canvas.addEventListener('error',tile,true);canvas.addEventListener('load',tile,true);
  return()=>{canvas.removeEventListener('error',tile,true);canvas.removeEventListener('load',tile,true)};
 },[mapAttempt]);

 const retryMap=()=>{setTileFailed(false);setMapState('loading');setMapAttempt(attempt=>attempt+1)};
 const label=variant==='sweet'?'카페 디저트':variant==='rich'?'고소한':'매운';
 const statusText=locationState==='located'?'내 위치 기준 15km':locationState==='locating'?'위치 확인 중':locationState==='denied'?'브라우저 위치 권한을 허용한 뒤 다시 눌러 주세요':locationState==='outside'?'국내 위치를 확인하지 못했어요. 기기의 위치 설정을 확인해 주세요':locationState==='inaccurate'?'위치를 확인하지 못했어요. 다시 눌러 주세요':'내 위치를 눌러 주변 15km 보기';
 return <div className={fullScreen?'map-panel map-fullscreen':'map-panel'} ref={rootRef}>
  <div key={mapAttempt} className="map-canvas" ref={canvasRef} aria-label={`카카오 대한민국 ${label} 메뉴 지도`}/>
  {mapState!=='ready'&&<div className="map-unavailable"><MapPin size={30} strokeWidth={1.3}/><span className="eyebrow">KAKAO MAP · {variant.toUpperCase()} NOWGO</span><h3>{mapState==='loading'?'지도를 불러오는 중':mapState==='setup'?'지도 연결을 준비하고 있어요':'잠시 지도를 불러올 수 없어요'}</h3><p>지도 연결을 확인한 뒤 다시 시도해 주세요.</p>{mapState!=='loading'&&<button type="button" className="text-link" onClick={retryMap}>지도 다시 불러오기</button>}<a className="text-link" href="https://www.nowgo.space/" target="_blank" rel="noreferrer">나우고에서 운영 매장 확인 <ArrowUpRight size={18}/></a></div>}
  {mapState==='ready'&&onLocation&&<button type="button" className="map-location-button" aria-label="내 위치로 이동" onClick={requestLocation}><LocateFixed size={16}/>{locationState==='locating'?'위치 다시 확인':'내 위치'}</button>}
  {mapState==='ready'&&tileFailed&&<div role="alert" style={{position:'absolute',bottom:60,right:16,zIndex:5,maxWidth:300,padding:14,borderRadius:10,background:'#fff',color:'#20211e',boxShadow:'0 3px 18px #0002',fontSize:14}}>지도 배경을 불러오지 못했어요.<button type="button" className="text-link" onClick={retryMap}>지도 다시 불러오기</button></div>}
  {mapState==='ready'&&(locationState==='outside'||locationState==='denied'||locationState==='inaccurate')&&<div role="status" style={{position:'absolute',top:72,right:16,zIndex:5,maxWidth:300,padding:14,borderRadius:10,background:'#fff',color:'#20211e',boxShadow:'0 3px 18px #0002',fontSize:14}}>{statusText}<button type="button" className="text-link" onClick={requestLocation}>위치 다시 확인</button></div>}
  <div className="map-caption"><span>카카오 지도</span><span>{mapState==='ready'?statusText:'지도 연결 확인 중'}</span></div>
 </div>;
}

