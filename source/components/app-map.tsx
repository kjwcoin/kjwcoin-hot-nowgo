'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import KakaoMap from './kakao-map';
import {api} from '@/lib/client';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import {type Menu,money} from '@/lib/menus';
import {MAP_RADIUS_KM,type GeoPoint} from '@/lib/nearby-demo';
import {isKoreanCoordinate} from '@/lib/korean-region';
import {APP_PARENT_ORIGIN,postAppEvent} from '@/lib/app-embed';
export default function AppMap({variant}:{variant:SiteVariant}){
 const theme=siteConfig(variant),taste=variant==='hot'?'매운맛':variant==='rich'?'느끼함':'달콤함';
 const [query,setQuery]=useState(''),[heat,setHeat]=useState(0),[flavor,setFlavor]=useState('전체'),[category,setCategory]=useState('전체');
 const [menus,setMenus]=useState<Menu[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[location,setLocation]=useState<GeoPoint|null>(null);
 const request=useRef(0),controller=useRef<AbortController|null>(null);
 const load=useCallback(async(nextPage=0)=>{
  const run=++request.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;
  const params=new URLSearchParams({page:String(nextPage)});if(query.trim())params.set('q',query.trim());if(heat)params.set('heat',String(heat));if(flavor!=='전체')params.set('flavor',flavor);if(category!=='전체')params.set('category',category);if(location){params.set('lat',String(location.lat));params.set('lng',String(location.lng));params.set('radiusKm',String(MAP_RADIUS_KM))}
  setLoading(true);setError('');try{const data=await api<{menus:Menu[];hasMore:boolean}>('/api/menus?'+params,{signal:abort.signal});if(run!==request.current)return;const real=(Array.isArray(data.menus)?data.menus:[]).filter(menu=>menu&&menu.isDemo!==true);setMenus(previous=>nextPage?[...previous,...real]:real);setPage(nextPage);setHasMore(data.hasMore===true)}catch(cause){if(run!==request.current||abort.signal.aborted)return;setError(cause instanceof Error?cause.message:'매장 정보를 불러오지 못했어요.');setMenus([]);setHasMore(false)}finally{if(run===request.current)setLoading(false)}
 },[query,heat,flavor,category,location]);
 const cancel=useCallback(()=>{request.current++;controller.current?.abort()},[]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),query?250:0);const refresh=()=>void load();window.addEventListener('focus',refresh);const receive=(event:MessageEvent)=>{if(event.origin===APP_PARENT_ORIGIN&&event.source===window.parent&&event.data?.type==='nowgo:map-refresh')refresh()};window.addEventListener('message',receive);const visible=()=>{if(document.visibilityState==='visible')refresh()};const interval=setInterval(visible,60_000);window.addEventListener('nowgo:catalog-refresh',refresh);document.addEventListener('visibilitychange',visible);return()=>{clearTimeout(timer);clearInterval(interval);window.removeEventListener('nowgo:catalog-refresh',refresh);document.removeEventListener('visibilitychange',visible);cancel();window.removeEventListener('focus',refresh);window.removeEventListener('message',receive)}},[load,query,cancel]);
 const matched=useMemo(()=>menus.filter(menu=>(!heat||menu.heat===heat)&&(flavor==='전체'||menu.flavor===flavor)&&(category==='전체'||menu.category===category)&&`${menu.name} ${menu.shop} ${menu.area}`.replace(/\s/g,'').includes(query.trim().replace(/\s/g,''))),[menus,heat,flavor,category,query]);
 const pins=useMemo(()=>matched.filter(menu=>isKoreanCoordinate(menu.lat,menu.lng)),[matched]);
 function select(menu:Menu){const fields=['id','placeId','name','shop','price','image','area','ownerRegistered','lat','lng'] as const;const item=Object.fromEntries(fields.map(key=>[key,menu[key]]));postAppEvent({type:'nowgo:menu-selected',brand:variant,menu:item})}
 return <main className="nowgo-app-map" data-app-map data-flavor={variant}>
  <div className="app-map-filters" aria-label="메뉴 검색과 필터"><label className="app-map-search"><span>검색</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={theme.search} aria-label="매장·메뉴 검색"/></label><div className="app-map-selects">
  <label>{taste} 단계<select value={heat} onChange={event=>setHeat(Number(event.target.value))}><option value={0}>모든 단계</option>{theme.heat.map((label,index)=><option key={label} value={index+1}>{index+1}단계 · {label}</option>)}</select></label>
  <label>맛의 결<select value={flavor} onChange={event=>setFlavor(event.target.value)}>{theme.flavors.map(label=><option key={label} value={label}>{label==='전체'?'모든 결':label}</option>)}</select></label>
  <label>음식 카테고리<select value={category} onChange={event=>setCategory(event.target.value)}><option value="전체">모든 음식</option>{theme.categories.map(label=><option key={label} value={label}>{label}</option>)}</select></label></div></div>
  <div className="app-map-canvas"><KakaoMap appLocationBridge fullScreen variant={variant} menus={pins} onSelect={select} onLocation={setLocation}/>
  <div className="app-map-bottom" aria-live="polite">{loading?<p className="app-map-note">매장을 불러오는 중이에요.</p>:error?<p className="app-map-note">{error}<button type="button" onClick={()=>void load()}>다시 불러오기</button></p>:matched.length?<div className="app-map-cards">{matched.map(menu=><button key={menu.id} type="button" className="app-map-card" onClick={()=>select(menu)}><strong>{menu.shop}</strong><span>{menu.name} · {money(menu.price)}</span><small>{menu.ownerRegistered?'공식 매장':'유저 제보 · 영업현황 확인불가'}</small></button>)}{hasMore&&<button type="button" className="app-map-card" onClick={()=>void load(page+1)}>메뉴 더 보기</button>}</div>:<p className="app-map-note">{query||heat||flavor!=='전체'||category!=='전체'?'조건에 맞는 매장·메뉴가 아직 없어요.':'첫 매장의 제보를 기다리고 있어요.'}<button type="button" onClick={()=>postAppEvent({type:'nowgo:open-report',brand:variant})}>유저 제보하기</button></p>}</div>
  </div>
 </main>;
}
