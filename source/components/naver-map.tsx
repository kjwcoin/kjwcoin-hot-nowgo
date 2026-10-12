'use client';
import {displayTasteLevel,tastePinPosition} from '@/lib/taste-level';

import {useCallback,useEffect,useImperativeHandle,useMemo,useRef,useState,type Ref} from 'react';
import {ArrowUpRight,LocateFixed,MapPin} from 'lucide-react';
import {isKoreanCoordinate,isKoreanRegion} from '@/lib/korean-region';
import {type GeoPoint} from '@/lib/nearby-demo';
import {type DemoLocationState} from '@/lib/resolve-demo-land';
import {requestCurrentLocation,locationStatusText,type LocationState} from '@/lib/request-current-location';
import {appGeolocation} from '@/lib/app-geolocation';
import {densityLevel,densityColor,type DensityGroup} from '@/lib/map-density';
import {money,type Menu} from '@/lib/menus';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { naver?:any;navermap_authFailure?:()=>void } }

let naverSdkPromise:Promise<any>|null=null;

function loadNaverSdk(key:string){
 if(naverSdkPromise)return naverSdkPromise;
 naverSdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=setTimeout(()=>{script?.remove();reject(new Error('Naver Map SDK timed out'))},10000);
  const ready=()=>{
   clearTimeout(timer);
   if(!window.naver?.maps?.Map||!window.naver.maps.Service){reject(new Error('Naver Map SDK is unavailable'));return}
   resolve(window.naver);
  };
  if(window.naver?.maps?.Map&&window.naver.maps.Service){ready();return}
  window.navermap_authFailure=()=>window.dispatchEvent(new Event('nowgo:naver-auth-failed'));
  script.src=`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}&submodules=geocoder`;
  script.async=true;
  script.onload=ready;
  script.onerror=()=>{clearTimeout(timer);script?.remove();reject(new Error('Naver Map SDK load failed'))};
  document.head.appendChild(script);
 }).catch(error=>{naverSdkPromise=null;throw error});
 return naverSdkPromise;
}

type MapVariant='hot'|'rich'|'sweet';
export type NaverMapHandle={requestLocation:()=>void};
type Props={
 menus:Menu[];
 densityQuery?:string;
 onSelect:(menu:Menu)=>void;
 onPoint?:(point:{address:string;lat:number;lng:number})=>void;
 onLocation?:(point:GeoPoint)=>void;
 onLocationState?:(state:LocationState)=>void;
 locationControl?:Ref<NaverMapHandle>;
 onDemoPositions?:(origin:GeoPoint,points:GeoPoint[],state:DemoLocationState)=>void;
 addressSearch?:{text:string;requestId:number}|null;
 coordinateSearch?:{lat:number;lng:number;requestId:number}|null;
 onAddressFound?:(point:{address:string;lat:number;lng:number})=>void;
 onAddressError?:()=>void;
 fullScreen?:boolean;
 selectedId?:string;
 variant?:MapVariant;
 appLocationBridge?:boolean;
 onMapState?:(state:'loading'|'ready'|'setup'|'error')=>void;
};

export default function NaverMap({menus,densityQuery,onSelect,onPoint,onLocation,onLocationState,locationControl,onDemoPositions,addressSearch,coordinateSearch,onAddressFound,onAddressError,fullScreen=false,selectedId,variant='hot',appLocationBridge=false,onMapState}:Props){
 const rootRef=useRef<HTMLDivElement>(null);
 const canvasRef=useRef<HTMLDivElement>(null);
 const mapRef=useRef<any>(null);
 const naverRef=useRef<any>(null);
 const overlaysRef=useRef<any[]>([]);
 const userMarkerRef=useRef<any>(null);
 const addressMarkerRef=useRef<any>(null);
 const userPointRef=useRef<GeoPoint|null>(null);
 const callbacksRef=useRef({onSelect,onPoint,onLocation,onLocationState,onDemoPositions:appLocationBridge?undefined:onDemoPositions,onAddressFound,onAddressError,onMapState});
 useEffect(()=>{callbacksRef.current={onSelect,onPoint,onLocation,onLocationState,onDemoPositions:appLocationBridge?undefined:onDemoPositions,onAddressFound,onAddressError,onMapState};});
 const pointRequestRef=useRef(0);
 const locationRequestRef=useRef(0);
 const locationBusyRef=useRef(false);
 const [mapState,setMapState]=useState<'loading'|'ready'|'setup'|'error'>('loading');
 const [zoom,setZoom]=useState(12);
 const [density,setDensity]=useState<{key:string;groups:DensityGroup[];total:number}|null>(null);
 const [densityError,setDensityError]=useState('');
 const densityKey=!selectedId&&zoom<16&&variant==='hot'&&densityQuery!==undefined?densityQuery+'&level='+densityLevel(zoom):'';
 const densityGroups=useMemo(()=>density?.key===densityKey?density.groups:[],[density,densityKey]);
 useEffect(()=>{if(!densityKey)return;let cancelled=false;const abort=new AbortController();const refresh=()=>fetch('/api/map-density?'+densityKey,{signal:abort.signal}).then(async response=>{const data=await response.json();if(!response.ok||data.complete!==true)throw new Error(data.error||'지역별 집계를 확인하지 못했습니다.');if(!cancelled){setDensity({key:densityKey,groups:data.groups,total:data.total});setDensityError('')}}).catch(e=>{if(!cancelled){setDensity(null);setDensityError(e instanceof Error?e.message:'지역별 집계를 확인하지 못했습니다.')}});void refresh();const timer=setInterval(refresh,30000);return()=>{cancelled=true;abort.abort();clearInterval(timer)}},[densityKey]);
 const [tileFailed,setTileFailed]=useState(false);
 const [mapAttempt,setMapAttempt]=useState(0);
 const [locationState,setLocationState]=useState<LocationState>('idle');
 const [hasUserPoint,setHasUserPoint]=useState(false);
 useEffect(()=>{callbacksRef.current.onLocationState?.(locationState)},[locationState]);
 useEffect(()=>{callbacksRef.current.onMapState?.(mapState)},[mapState]);
 const resizeMap=useCallback(()=>{const map=mapRef.current,n=naverRef.current,canvas=canvasRef.current;if(map&&n&&canvas&&canvas.clientWidth&&canvas.clientHeight)map.setSize(new n.maps.Size(canvas.clientWidth,canvas.clientHeight))},[]);
 useEffect(()=>{const root=rootRef.current;if(!root)return;const relayout=()=>{if(root.clientWidth>0&&root.clientHeight>0)resizeMap()};const observer=new ResizeObserver(relayout);observer.observe(root);window.addEventListener('nowgo:map-visible',relayout);return()=>{observer.disconnect();window.removeEventListener('nowgo:map-visible',relayout)}},[resizeMap]);

 const focusNeighborhood=useCallback((point:GeoPoint)=>{
  const map=mapRef.current,k=naverRef.current;
  if(!map||!k)return;
  resizeMap();
  map.setZoom(12);
  map.setCenter(new k.maps.LatLng(point.lat,point.lng));
 },[resizeMap]);

 const showNearby=useCallback((point:GeoPoint)=>{
   const map=mapRef.current,k=naverRef.current;
   userPointRef.current=point;
   setHasUserPoint(true);
   setLocationState('located');
   callbacksRef.current.onLocation?.(point);
   if(!map||!k){callbacksRef.current.onDemoPositions?.(point,[],'error');return}
   const position=new k.maps.LatLng(point.lat,point.lng);
   userMarkerRef.current?.setMap(null);
   userMarkerRef.current=new k.maps.Marker({map,position,title:'내 위치'});
   focusNeighborhood(point);
   callbacksRef.current.onDemoPositions?.(point,[],'ready');
 },[focusNeighborhood]);

 const requestLocation=useCallback(()=>{
  if(locationBusyRef.current)return;
  const request=++locationRequestRef.current;
  // A second tap recenters immediately, even if the device cannot refresh its GPS fix.
  if(userPointRef.current)showNearby(userPointRef.current)
  if(!window.isSecureContext||!navigator.geolocation){setLocationState('unsupported');return}
  locationBusyRef.current=true;
  setLocationState('locating');
  void requestCurrentLocation(appLocationBridge?appGeolocation():navigator.geolocation,{isCurrent:()=>request===locationRequestRef.current,onRetry:()=>setLocationState('retrying')}).then(result=>{
   if(request!==locationRequestRef.current)return;
   locationBusyRef.current=false;
   if(result.state==='located')showNearby(result.point);
   else if(result.state!=='cancelled')setLocationState(result.state);
  });
 },[showNearby,appLocationBridge]);
 useImperativeHandle(locationControl,()=>({requestLocation}),[requestLocation]);

 useEffect(()=>{
  let cancelled=false;
  const controller=new AbortController();
  const authFailed=()=>{if(!cancelled)setMapState('error')};window.addEventListener('nowgo:naver-auth-failed',authFailed);
  let configTimeout:ReturnType<typeof setTimeout>|undefined;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(entry=>entry.isIntersecting))return;
   observer.disconnect();
   configTimeout=setTimeout(()=>controller.abort(),8000);
   fetch('/api/config',{cache:'no-store',signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('Map configuration unavailable');return response.json() as Promise<{naverKey?:string}>}).then(async config=>{
    clearTimeout(configTimeout);
    if(cancelled)return;
    if(!config.naverKey){setMapState('setup');return}
    timeout=setTimeout(()=>setMapState('error'),10000);
    const k=await loadNaverSdk(config.naverKey);
    if(cancelled||!canvasRef.current)return;
    if(timeout)clearTimeout(timeout);
    naverRef.current=k;
    // Neutral inland placeholder only while waiting for the visitor's own GPS fix.
    const map=new k.maps.Map(canvasRef.current,{center:new k.maps.LatLng(37.5665,126.978),zoom:12,zoomControl:true,zoomControlOptions:{position:k.maps.Position.RIGHT_CENTER}});
    mapRef.current=map;
    setZoom(map.getZoom());
    k.maps.Event.addListener(map,'zoom_changed',()=>setZoom(map.getZoom()));
    if(callbacksRef.current.onPoint)k.maps.Event.addListener(map,'click',(event:any)=>{
     const lat=event.coord.lat(),lng=event.coord.lng();
     if(!isKoreanCoordinate(lat,lng))return;
     const run=++pointRequestRef.current;
     k.maps.Service.reverseGeocode({coords:event.coord,orders:[k.maps.Service.OrderType.ROAD_ADDR,k.maps.Service.OrderType.ADDR].join(',')},(status:any,response:any)=>{
      if(cancelled||run!==pointRequestRef.current||status!==k.maps.Service.Status.OK)return;
      const result=response?.v2,address=result?.address?.roadAddress||result?.address?.jibunAddress;
      if(!address||!result.results?.some((r:any)=>isKoreanRegion(r.region?.area1?.name||'')))return;
      addressMarkerRef.current?.setMap(null);
      addressMarkerRef.current=new k.maps.Marker({map,position:event.coord,title:'제보할 가게 주소'});
      callbacksRef.current.onPoint?.({address,lat,lng});
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
  return()=>{cancelled=true;window.removeEventListener('nowgo:naver-auth-failed',authFailed);controller.abort();clearTimeout(configTimeout);if(timeout)clearTimeout(timeout);observer.disconnect();pointRequestRef.current++;locationRequestRef.current++;locationBusyRef.current=false;overlaysRef.current.forEach(overlay=>overlay.setMap(null));userMarkerRef.current?.setMap(null);addressMarkerRef.current?.setMap(null);mapRef.current?.destroy();mapRef.current=null};
 },[fullScreen,mapAttempt,requestLocation,showNearby]);

 useEffect(()=>{
  if(mapState!=='ready'||!mapRef.current||!naverRef.current)return;
  const k=naverRef.current;
  overlaysRef.current.forEach(overlay=>overlay.setMap(null));
  if(densityKey){
   overlaysRef.current=densityGroups.map(group=>{
    const button=document.createElement('button'),number=document.createElement('strong'),label=document.createElement('span');
    button.type='button';button.className='map-density-marker';number.textContent=String(group.count);label.textContent=group.label;
    const color=densityColor(group.count);number.style.background=color.background;number.style.color=color.color;
    button.setAttribute('aria-label',`${group.label} · 매운맛집 ${group.count}곳 · 확대해서 보기`);button.append(number,label);
    button.onclick=()=>{mapRef.current?.setZoom(group.level==='region'?11:group.level==='district'?14:16);mapRef.current?.panTo(new k.maps.LatLng(group.lat,group.lng))};
    return new k.maps.Marker({map:mapRef.current,position:new k.maps.LatLng(group.lat,group.lng),icon:{content:button,anchor:new k.maps.Point(34,34)}});
   });
   return()=>overlaysRef.current.forEach(overlay=>overlay.setMap(null));
  }
  const groups=new Map<string,Menu[]>();
  menus.filter(menu=>(!appLocationBridge||menu.isDemo===false)&&menu.lat!==null&&menu.lng!==null).forEach(menu=>groups.set(menu.placeId,[...(groups.get(menu.placeId)||[]),menu]));
  overlaysRef.current=[...groups.values()].map(group=>{
   const menu=group[0],button=document.createElement('button');
   button.type='button';
   button.className='map-anchor map-anchor--food'+(!menu.isDemo&&!menu.ownerRegistered?' map-anchor--reported':'')+(menu.id===selectedId?' selected':'');
   button.setAttribute('aria-label',`${menu.isDemo?'가매장 ':menu.ownerRegistered?'점주 가입매장 ':'제보자 등록매장 · 영업현황 확인불가 '}${menu.shop}, ${menu.name}, ${menu.heat}단계, ${money(menu.price)}. 메뉴 상세 보기`);
   button.title=`${menu.shop} · ${menu.name}`;
   const pin=document.createElement('span');
   pin.className='map-anchor-pin';
   pin.setAttribute('aria-hidden','true');
   const level=displayTasteLevel(variant,menu.heat);
   pin.style.backgroundPosition=tastePinPosition(variant,level);
   const stage=document.createElement('span');
   stage.className='map-anchor-level';
   stage.textContent=String(level);
   pin.append(stage);
   const price=document.createElement('span');
   price.className='map-anchor-price';
   price.textContent=money(menu.price);
   button.append(pin,price);
   button.onclick=()=>callbacksRef.current.onSelect(menu);
   return new k.maps.Marker({map:mapRef.current,position:new k.maps.LatLng(menu.lat,menu.lng),icon:{content:button,anchor:new k.maps.Point(31,70)},zIndex:menu.id===selectedId?20:10});
  });
  resizeMap();
  return()=>overlaysRef.current.forEach(overlay=>overlay.setMap(null));
 },[mapState,menus,selectedId,variant,appLocationBridge,densityKey,densityGroups,resizeMap]);

 useEffect(()=>{
  if(mapState!=='ready'||!mapRef.current||!naverRef.current)return;
  const menu=menus.find(item=>item.id===selectedId);
  if(menu&&menu.lat!==null&&menu.lng!==null){mapRef.current.setZoom(15);mapRef.current.panTo(new naverRef.current.maps.LatLng(menu.lat,menu.lng))}
 },[mapState,menus,selectedId]);

 useEffect(()=>{
  if(mapState!=='ready'||!mapRef.current||!naverRef.current)return;
  if(!addressSearch?.text){addressMarkerRef.current?.setMap(null);return}
  let cancelled=false;
  const k=naverRef.current;
  k.maps.Service.geocode({query:addressSearch.text},(status:any,response:any)=>{
   const results=response?.v2?.addresses;
   if(cancelled)return;
   const found=results?.find((item:any)=>isKoreanCoordinate(Number(item.y),Number(item.x)));
   if(status!==k.maps.Service.Status.OK||!found){callbacksRef.current.onAddressError?.();return}
   const lat=Number(found.y),lng=Number(found.x);
   const position=new k.maps.LatLng(lat,lng);
   addressMarkerRef.current?.setMap(null);
   addressMarkerRef.current=new k.maps.Marker({map:mapRef.current,position,title:'제보할 가게 주소'});
   mapRef.current.setZoom(15);
   mapRef.current.panTo(position);
   callbacksRef.current.onAddressFound?.({address:found.roadAddress||found.jibunAddress,lat,lng});
  });
  return()=>{cancelled=true};
 },[addressSearch,mapState]);

 useEffect(()=>{
  if(!coordinateSearch||mapState!=='ready'||!mapRef.current||!naverRef.current)return;
  let cancelled=false;
  const k=naverRef.current,{lat,lng}=coordinateSearch;
  if(!isKoreanCoordinate(lat,lng)){callbacksRef.current.onAddressError?.();return}
  k.maps.Service.reverseGeocode({coords:new k.maps.LatLng(lat,lng),orders:[k.maps.Service.OrderType.ROAD_ADDR,k.maps.Service.OrderType.ADDR].join(',')},(status:any,response:any)=>{
   if(cancelled)return;
   const result=response?.v2,address=result?.address?.roadAddress||result?.address?.jibunAddress;
   if(status!==k.maps.Service.Status.OK||!address||!result.results?.some((r:any)=>isKoreanRegion(r.region?.area1?.name||''))){callbacksRef.current.onAddressError?.();return}
   const position=new k.maps.LatLng(lat,lng);
   addressMarkerRef.current?.setMap(null);
   addressMarkerRef.current=new k.maps.Marker({map:mapRef.current,position,title:'GPS로 찾은 제보 위치'});
   mapRef.current.setZoom(15);
   mapRef.current.panTo(position);
   callbacksRef.current.onAddressFound?.({address,lat,lng});
  });
  return()=>{cancelled=true};
 },[coordinateSearch,mapState]);

 useEffect(()=>{
  if(mapState!=='ready'||!rootRef.current)return;
  const resize=new ResizeObserver(()=>resizeMap());
  resize.observe(rootRef.current);
  return()=>resize.disconnect();
 },[mapState,resizeMap]);

 useEffect(()=>{
  const canvas=canvasRef.current;
  if(!canvas)return;
  const failed=new Set<string>();
  const tile=(event:Event)=>{
   const img=event.target;
   if(!(img instanceof HTMLImageElement)||!/(?:pstatic.net|map.naver.com)/.test(img.src))return;
   if(event.type==='error')failed.add(img.src);else failed.delete(img.src);
   setTileFailed(failed.size>0);
  };
  canvas.addEventListener('error',tile,true);canvas.addEventListener('load',tile,true);
  return()=>{canvas.removeEventListener('error',tile,true);canvas.removeEventListener('load',tile,true)};
 },[mapAttempt]);

 const retryMap=()=>{setTileFailed(false);setLocationState(userPointRef.current?'located':'idle');setMapState('loading');setMapAttempt(attempt=>attempt+1)};
 const label=variant==='sweet'?'카페 디저트':variant==='rich'?'고소한':'매운';
 const locationBusy=locationState==='locating'||locationState==='retrying';
 const locationFailed=!['idle','locating','retrying','located'].includes(locationState);
 const statusText=locationStatusText[locationState];
 return <div className={fullScreen?'map-panel map-fullscreen':'map-panel'} ref={rootRef}>
  <div key={mapAttempt} className="map-canvas" ref={canvasRef} aria-label={`네이버 대한민국 ${label} 메뉴 지도`}/>
  {mapState!=='ready'&&<div className="map-unavailable"><MapPin size={30} strokeWidth={1.3}/><span className="eyebrow">NAVER MAP · {variant.toUpperCase()} NOWGO</span><h3>{mapState==='loading'?'지도를 불러오는 중':mapState==='setup'?'지도 연결을 준비하고 있어요':'잠시 지도를 불러올 수 없어요'}</h3><p>지도 연결을 확인한 뒤 다시 시도해 주세요.</p>{mapState!=='loading'&&<button type="button" className="text-link" onClick={retryMap}>지도 다시 불러오기</button>}{!appLocationBridge&&<a className="text-link" href="https://www.nowgo.space/" target="_blank" rel="noreferrer">나우고에서 운영 매장 확인 <ArrowUpRight size={18}/></a>}</div>}
  {mapState==='ready'&&onLocation&&<button type="button" className="map-location-button" aria-label="내 위치로 이동" onClick={requestLocation} disabled={locationBusy}><LocateFixed size={16}/>{locationBusy?'위치 확인 중':'내 위치'}</button>}
  {mapState==='ready'&&tileFailed&&<div role="alert" style={{position:'absolute',bottom:60,right:16,zIndex:5,maxWidth:300,padding:14,borderRadius:10,background:'#fff',color:'#20211e',boxShadow:'0 3px 18px #0002',fontSize:14}}>지도 배경을 불러오지 못했어요.<button type="button" className="text-link" onClick={retryMap}>지도 다시 불러오기</button></div>}
  {mapState==='ready'&&locationFailed&&<div role="status" style={{position:'absolute',top:72,right:16,zIndex:5,maxWidth:300,padding:14,borderRadius:10,background:'#fff',color:'#20211e',boxShadow:'0 3px 18px #0002',fontSize:14}}>{statusText}{hasUserPoint&&<p>이전에 확인한 위치를 표시하고 있어요.</p>}<button type="button" className="text-link" onClick={requestLocation}>위치 다시 확인</button></div>}
  {densityKey&&<div className="map-density-legend" role="status"><strong>{densityLevel(zoom)==='region'?'지역별':densityLevel(zoom)==='district'?'구·군별':'동·읍·면별'} 매운맛집</strong><span>{densityError||((density?.key===densityKey?density.total+'곳 · ':'집계 중 · ')+'제보·등록된 매장 수')}</span><span><i/> 적음 <i/> 많음 · 원을 누르면 확대</span></div>}
  <div className="map-caption"><span>네이버 지도</span><span>{mapState==='ready'?statusText:'지도 연결 확인 중'}</span></div>
 </div>;
}
