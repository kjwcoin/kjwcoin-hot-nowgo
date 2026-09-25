'use client';
import {useEffect,useMemo,useState} from 'react';
import {type Menu} from '@/lib/menus';

type Point={lat:number;lng:number};
const FALLBACK:Point={lat:37.5446,lng:127.0557};

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
 const latSpan=0.12;
 const lngSpan=0.18;
 const left=(p.lng-lngSpan).toFixed(5);
 const bottom=(p.lat-latSpan).toFixed(5);
 const right=(p.lng+lngSpan).toFixed(5);
 const top=(p.lat+latSpan).toFixed(5);
 return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${p.lat.toFixed(6)}%2C${p.lng.toFixed(6)}`;
}

export default function OpenFreeMap({menus,onSelect,selectedId}:{menus:Menu[],onSelect:(m:Menu)=>void,selectedId?:string}){
 const candidates=useMemo(()=>menus.filter((m):m is Menu&{lat:number;lng:number}=>m.isDemo&&m.lat!==null&&m.lng!==null),[menus]);
 const selected=menus.find(m=>m.id===selectedId);
 const initial=candidates[0]?{lat:candidates[0].lat,lng:candidates[0].lng}:FALLBACK;
 const [focus,setFocus]=useState<Point>(initial);
 const [focusMenu,setFocusMenu]=useState<(Menu&{lat:number;lng:number})|null>(candidates[0]||null);
 const [locationMode,setLocationMode]=useState<'loading'|'nearby'|'fallback'>('loading');

 useEffect(()=>{
  if(selected&&selected.lat!==null&&selected.lng!==null){
   setFocus({lat:selected.lat,lng:selected.lng});
   setFocusMenu(selected as Menu&{lat:number;lng:number});
   setLocationMode('nearby');
   return;
  }
  if(!navigator.geolocation||candidates.length===0){
   setLocationMode('fallback');
   return;
  }
  navigator.geolocation.getCurrentPosition(
   ({coords})=>{
    const here={lat:coords.latitude,lng:coords.longitude};
    if(!inKorea(here)){setLocationMode('fallback');return;}
    const nearest=[...candidates].sort((a,b)=>distance(here,{lat:a.lat,lng:a.lng})-distance(here,{lat:b.lat,lng:b.lng}))[0];
    if(nearest){
     setFocus({lat:nearest.lat,lng:nearest.lng});
     setFocusMenu(nearest);
     setLocationMode('nearby');
    }else setLocationMode('fallback');
   },
   ()=>setLocationMode('fallback'),
   {enableHighAccuracy:false,timeout:5000,maximumAge:300000}
  );
 },[candidates,selected]);

 return <div className="map-canvas" style={{position:'absolute',inset:0,overflow:'hidden',background:'#e9f7f1'}}>
  <iframe
   title="대한민국 카페 디저트 지도"
   src={embedUrl(focus)}
   style={{border:0,width:'100%',height:'100%',display:'block'}}
   loading="eager"
   referrerPolicy="no-referrer-when-downgrade"
  />
  <div style={{position:'absolute',left:12,top:12,zIndex:3,pointerEvents:'none',background:'rgba(255,255,255,.92)',border:'1px solid rgba(24,61,53,.12)',borderRadius:999,padding:'8px 12px',fontSize:12,fontWeight:700,color:'#183d35'}}>
   {locationMode==='loading'?'내 위치 주변 가매장 찾는 중':locationMode==='nearby'?'내 위치 기준 · 가까운 가매장':'가매장 기준 · 성수'}
  </div>
  {focusMenu&&<button
    type="button"
    className="map-anchor selected"
    onClick={()=>onSelect(focusMenu)}
    style={{position:'absolute',left:'50%',bottom:44,transform:'translateX(-50%)',zIndex:3,maxWidth:'80%'}}
  >
    {focusMenu.shop} · {focusMenu.name}
  </button>}
 </div>;
}
