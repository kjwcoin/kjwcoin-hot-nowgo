'use client';
import {useEffect,useRef} from 'react';
import {type Menu,money} from '@/lib/menus';

declare global{interface Window{maplibregl?:any}}
let loader:Promise<any>|null=null;

function loadMapLibre(){
 if(window.maplibregl)return Promise.resolve(window.maplibregl);
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  if(!document.getElementById('maplibre-css')){
   const link=document.createElement('link');
   link.id='maplibre-css';
   link.rel='stylesheet';
   link.href='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
   document.head.appendChild(link);
  }
  const existing=document.getElementById('maplibre-js') as HTMLScriptElement|null;
  const done=()=>window.maplibregl?resolve(window.maplibregl):reject(new Error('MapLibre unavailable'));
  if(existing){existing.addEventListener('load',done,{once:true});existing.addEventListener('error',reject,{once:true});return}
  const script=document.createElement('script');
  script.id='maplibre-js';
  script.src='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
  script.async=true;
  script.onload=done;
  script.onerror=()=>{loader=null;reject(new Error('MapLibre failed to load'))};
  document.head.appendChild(script);
 });
 return loader;
}

export default function OpenFreeMap({menus,onSelect,selectedId}:{menus:Menu[],onSelect:(m:Menu)=>void,selectedId?:string}){
 const canvas=useRef<HTMLDivElement>(null);
 const map=useRef<any>(null);
 const markers=useRef<any[]>([]);

 useEffect(()=>{
  let cancelled=false;
  loadMapLibre().then((ml)=>{
   if(cancelled||!canvas.current)return;
   map.current=new ml.Map({
    container:canvas.current,
    style:'https://tiles.openfreemap.org/styles/liberty',
    center:[127.8,36.35],
    zoom:6,
    attributionControl:true,
   });
  }).catch(()=>{});
  return()=>{cancelled=true;markers.current.forEach(m=>m.remove?.());markers.current=[];map.current?.remove?.();map.current=null};
 },[]);

 useEffect(()=>{
  let timer:ReturnType<typeof setInterval>|undefined;
  const draw=()=>{
   const ml=window.maplibregl;
   if(!ml||!map.current)return false;
   markers.current.forEach(m=>m.remove?.());
   markers.current=menus.filter(m=>m.lat!==null&&m.lng!==null).map(m=>{
    const el=document.createElement('button');
    el.type='button';
    el.className='map-anchor'+(m.id===selectedId?' selected':'');
    el.textContent=`${m.isDemo?'[가매장] ':m.verifiedOwner?'[공식 점주] ':''}${m.name} · ${money(m.price)}`;
    el.onclick=()=>onSelect(m);
    return new ml.Marker({element:el,anchor:'bottom'}).setLngLat([m.lng,m.lat]).addTo(map.current);
   });
   return true;
  };
  if(!draw())timer=setInterval(()=>{if(draw()&&timer)clearInterval(timer)},250);
  return()=>{if(timer)clearInterval(timer);markers.current.forEach(m=>m.remove?.());markers.current=[]};
 },[menus,onSelect,selectedId]);

 useEffect(()=>{
  const m=menus.find(x=>x.id===selectedId);
  if(m&&m.lat!==null&&m.lng!==null&&map.current)map.current.flyTo({center:[m.lng,m.lat],zoom:13});
 },[selectedId,menus]);

 return <div className="map-canvas" ref={canvas} aria-label="대한민국 카페 디저트 대체 지도"/>;
}
