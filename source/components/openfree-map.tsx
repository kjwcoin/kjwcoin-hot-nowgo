'use client';
import {useMemo,useState} from 'react';
import {LocateFixed} from 'lucide-react';
import {type Menu} from '@/lib/menus';

type Point={lat:number;lng:number};
const INCHEON:Point={lat:37.4563,lng:126.7052};

function distance(a:Point,b:Point){
 const r=6371;
 const toRad=(v:number)=>v*Math.PI/180;
 const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);
 const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
 return 2*r*Math.asin(Math.sqrt(x));
}

function inKorea(p:Point){
 return p.lat>=33&&p.lat<=39.6&&p.lng>=124&&p.lng<=132;
}

function embedUrl(p:Point){
 const latSpan=0.09;
 const lngSpan=0.14;
 const left=(p.lng-lngSpan).toFixed(5);
 const bottom=(p.lat-latSpan).toFixed(5);
 const right=(p.lng+lngSpan).toFixed(5);
 const top=(p.lat+latSpan).toFixed(5);
 return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${p.lat.toFixed(6)}%2C${p.lng.toFixed(6)}`;
}

export default function OpenFreeMap({menus,onSelect,selectedId}:{menus:Menu[],onSelect:(m:Menu)=>void,selectedId?:string}){
 const candidates=useMemo(()=>menus.filter((m):m is Menu&{lat:number;lng:number}=>m.isDemo&&m.lat!==null&&m.lng!==null),[menus]);
 const selected=menus.find(m=>m.id===selectedId);
 const [focus,setFocus]=useState<Point>(INCHEON);
 const [locationMode,setLocationMode]=useState<'default'|'locating'|'located'|'denied'>('default');
 const [nearest,setNearest]=useState<(Menu&{lat:number;lng:number})|null>(candidates[0]||null);

 const locate=()=>{
  if(!navigator.geolocation){setLocationMode('denied');return;}
  setLocationMode('locating');
  navigator.geolocation.getCurrentPosition(
   ({coords})=>{
    const here={lat:coords.latitude,lng:coords.longitude};
    if(!inKorea(here)){setLocationMode('denied');return;}
    setFocus(here);
    const n=[...candidates].sort((a,b)=>distance(here,{lat:a.lat,lng:a.lng})-distance(here,{lat:b.lat,lng:b.lng}))[0]||null;
    setNearest(n);
    setLocationMode('located');
   },
   ()=>setLocationMode('denied'),
   {enableHighAccuracy:true,timeout:8000,maximumAge:60000}
  );
 };

 const focusMenu=selected&&selected.lat!==null&&selected.lng!==null
  ? selected as Menu&{lat:number;lng:number}
  : nearest;

 return <div className="map-canvas" style={{position:'absolute',inset:0,overflow:'hidden',background:'#e9f7f1'}}>
  <iframe
   title="대한민국 카페 디저트 지도"
   src={embedUrl(selected&&selected.lat!==null&&selected.lng!==null?{lat:selected.lat,lng:selected.lng}:focus)}
   style={{border:0,width:'100%',height:'100%',display:'block'}}
   loading="eager"
   referrerPolicy="no-referrer-when-downgrade"
  />
  <div style={{position:'absolute',left:12,top:12,zIndex:4,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
   <div style={{background:'rgba(255,255,255,.94)',border:'1px solid rgba(24,61,53,.12)',borderRadius:999,padding:'8px 12px',fontSize:12,fontWeight:700,color:'#183d35'}}>
    {locationMode==='located'?'내 실제 위치 기준':locationMode==='locating'?'현재 위치 확인 중':locationMode==='denied'?'위치 권한 필요 · 인천 기본':'인천 기본 지도'}
   </div>
   <button
    type="button"
    onClick={locate}
    style={{border:'1px solid rgba(38,124,107,.28)',background:'#fff',borderRadius:999,padding:'9px 13px',fontSize:12,fontWeight:800,color:'#267c6b',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,boxShadow:'0 2px 10px rgba(24,61,53,.12)'}}
   >
    내 위치로 보기
   </button>
  </div>
  {focusMenu&&<button
    type="button"
    className="map-anchor selected"
    onClick={()=>onSelect(focusMenu)}
    style={{position:'absolute',left:'50%',bottom:44,transform:'translateX(-50%)',zIndex:3,maxWidth:'82%'}}
  >
    가까운 가매장 · {focusMenu.shop} · {focusMenu.name}
  </button>}
 </div>;
}
