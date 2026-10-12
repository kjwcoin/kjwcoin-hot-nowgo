'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
import {HEAT,money,type Menu} from '@/lib/menus';
import {RAMEN_REFERENCES} from '@/lib/hot-ad-policy';
import type {GeoPoint} from '@/lib/nearby-demo';
import StoreStatus from './store-status';
type Slot={menu_id:string;ramen_reference:keyof typeof RAMEN_REFERENCES};
export default function LocalAdSlot({point,onSelect}:{point:GeoPoint|null;onSelect:(menu:Menu)=>void}){
 const [ad,setAd]=useState<{menu:Menu;reference:Slot['ramen_reference'];locationKey:string}|null>(null);
 useEffect(()=>{let active=true;if(!point)return;async function load(){try{const data=await api<{slot:Slot|null}>('/api/hot-ads?action=slot&'+new URLSearchParams({lat:String(point!.lat),lng:String(point!.lng)}));if(!data.slot){if(active)setAd(null);return;}const product=await api<{menu:Menu}>('/api/menu?id='+encodeURIComponent(data.slot.menu_id));if(active)setAd({menu:{...product.menu,isAd:true},reference:data.slot.ramen_reference,locationKey:point!.lat+':'+point!.lng});}catch{if(active)setAd(null)}}const initial=setTimeout(()=>void load(),0);const timer=setInterval(()=>void load(),30000);return()=>{active=false;clearTimeout(initial);clearInterval(timer)}},[point]);
 if(!point||!ad||ad.locationKey!==point.lat+':'+point.lng)return null;
 const menu=ad.menu;
 return <article className="local-ad-card" aria-label="내 주변 유료 광고 1곳"><button type="button" className="local-ad-select" onClick={()=>onSelect(menu)}><span className="local-ad-photo"><img src={menu.image} alt={menu.name} width={100} height={100}/><span className="local-ad-badge">광고</span></span><span><small>{menu.shop} · 매장 직접 등록</small><strong>{menu.name}</strong><span>{money(menu.price)} · {menu.heat}단계 {HEAT[menu.heat-1]}</span><small>{RAMEN_REFERENCES[ad.reference]} · 점주가 확인한 체감</small></span></button><StoreStatus menuId={menu.id} isDemo={false} ownerRegistered={true}/></article>;
}
