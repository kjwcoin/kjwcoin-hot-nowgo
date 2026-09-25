'use client';
import {type Menu} from '@/lib/menus';

export default function OpenFreeMap({menus,onSelect,selectedId}:{menus:Menu[],onSelect:(m:Menu)=>void,selectedId?:string}){
 const selected=menus.find(m=>m.id===selectedId);
 return <div className="map-canvas" style={{position:'absolute',inset:0,overflow:'hidden',background:'#e9f7f1'}}>
  <iframe
   title="대한민국 카페 디저트 지도"
   src="https://www.openstreetmap.org/export/embed.html?bbox=124.0%2C33.0%2C132.0%2C39.5&layer=mapnik"
   style={{border:0,width:'100%',height:'100%',display:'block'}}
   loading="eager"
   referrerPolicy="no-referrer-when-downgrade"
  />
  {selected&&<button
    type="button"
    className="map-anchor selected"
    onClick={()=>onSelect(selected)}
    style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',zIndex:3}}
  >
    {selected.name}
  </button>}
 </div>;
}
