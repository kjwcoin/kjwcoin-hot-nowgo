'use client';
import {matchesMenuSearch,menuSearchError} from '@/lib/menu-search';
import {menuHeatAttribution} from '@/lib/menu-heat-attribution';
import {storePinMenu} from '@/lib/menu-store-groups';
import {mapStoreGroups,sourcedStoreMatches,sourcedStoresNearby} from '@/lib/map-sourced-stores';
import {useSourcedStores} from '@/hooks/use-sourced-stores';
import SourcedStoreCard from '@/components/sourced-store-card';
import SourcedStoreNotice from '@/components/sourced-store-notice';
import RegularFavorite from './regular-favorite';
import OwnerJoinRequest from './owner-join-request';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import KakaoMap from './kakao-map';
import {api} from '@/lib/client';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import {type Menu,money} from '@/lib/menus';
import {type GeoPoint} from '@/lib/nearby-demo';
import {mapBrowseOrigin,appendMapBrowseLocation} from '@/lib/map-browse-scope';
import {isKoreanCoordinate} from '@/lib/korean-region';
import {appParentOrigin,postAppEvent} from '@/lib/app-embed';
export default function AppMap({variant}:{variant:SiteVariant}){
 const theme=siteConfig(variant),taste=variant==='hot'?'매운맛':variant==='rich'?'느끼함':'달콤함';
 const [query,setQuery]=useState(''),[heat,setHeat]=useState(0),[flavor,setFlavor]=useState('전체'),[category,setCategory]=useState('전체');
 const [menus,setMenus]=useState<Menu[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[location,setLocation]=useState<GeoPoint|null>(null);
 const [selectedPlace,setSelectedPlace]=useState<string|null>(null),[listOpen,setListOpen]=useState(false);
 const request=useRef(0),controller=useRef<AbortController|null>(null);
 const browseOrigin=mapBrowseOrigin(variant,location);
 const load=useCallback(async(nextPage=0)=>{
  const run=++request.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;
  const params=new URLSearchParams({page:String(nextPage)});if(query.trim())params.set('q',query.trim());if(heat)params.set('heat',String(heat));if(flavor!=='전체')params.set('flavor',flavor);if(category!=='전체')params.set('category',category);appendMapBrowseLocation(params,variant,browseOrigin);
  setLoading(true);setError('');try{const data=await api<{menus:Menu[];hasMore:boolean}>('/api/menus?'+params,{signal:abort.signal});if(run!==request.current)return;const real=(Array.isArray(data.menus)?data.menus:[]).filter(menu=>menu&&menu.isDemo===false);setMenus(previous=>nextPage?[...previous,...real]:real);setPage(nextPage);setHasMore(data.hasMore===true)}catch(cause){if(run!==request.current||abort.signal.aborted)return;setError(cause instanceof Error?cause.message:'매장 정보를 불러오지 못했어요.');setMenus([]);setHasMore(false)}finally{if(run===request.current)setLoading(false)}
 },[query,heat,flavor,category,browseOrigin,variant]);
 const cancel=useCallback(()=>{request.current++;controller.current?.abort()},[]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),query?250:0);const refresh=()=>void load();window.addEventListener('focus',refresh);const receive=(event:MessageEvent)=>{if(event.origin!==appParentOrigin()||event.source!==window.parent)return;if(event.data?.type==='nowgo:map-refresh'){window.dispatchEvent(new Event('nowgo:catalog-refresh'));window.dispatchEvent(new Event('nowgo:map-visible'))}if(event.data?.type==='nowgo:map-probe')postAppEvent({type:'nowgo:map-frame-ready',brand:variant,realOnly:true})};window.addEventListener('message',receive);const visible=()=>{if(document.visibilityState==='visible')refresh()};const interval=setInterval(visible,30_000);window.addEventListener('nowgo:catalog-refresh',refresh);document.addEventListener('visibilitychange',visible);return()=>{clearTimeout(timer);clearInterval(interval);window.removeEventListener('nowgo:catalog-refresh',refresh);document.removeEventListener('visibilitychange',visible);cancel();window.removeEventListener('focus',refresh);window.removeEventListener('message',receive)}},[load,query,cancel,variant]);
 useEffect(()=>{postAppEvent({type:'nowgo:map-frame-ready',brand:variant,realOnly:true})},[variant]);
 const sourceState=useSourcedStores(variant);
 const sourceStores=useMemo(()=>sourceState.feed?.stores||[],[sourceState.feed]);
 const matchingSources=useMemo(()=>sourcedStoresNearby(sourceStores,browseOrigin).filter(store=>sourcedStoreMatches(store,{query,heat,flavor,category,budget:0})),[sourceStores,browseOrigin,query,heat,flavor,category]);
 const viewportCountQuery=useMemo(()=>new URLSearchParams({variant,q:query,heat:String(heat),flavor,category}).toString(),[variant,query,heat,flavor,category]);
 const matched=useMemo(()=>menus.filter(menu=>(!heat||menu.heat===heat)&&(flavor==='전체'||menu.flavor===flavor)&&(category==='전체'||menu.category===category)&&matchesMenuSearch([menu.name,menu.shop,menu.area],query)),[menus,heat,flavor,category,query]);
 const combinedStores=useMemo(()=>mapStoreGroups(matched,matchingSources,sourceStores),[matched,matchingSources,sourceStores]);
 const storeGroups=useMemo(()=>combinedStores.flatMap(group=>group.catalog?[group.catalog]:[]),[combinedStores]);
 const sourceOnlyStores=useMemo(()=>combinedStores.flatMap(group=>!group.catalog&&group.source?[group.source]:[]),[combinedStores]);
 const sourceByKey=useMemo(()=>new Map(combinedStores.flatMap(group=>group.source&&!group.catalog?.ownerRegistered?[[group.key,group.source] as const]:[])),[combinedStores]);
 const pins=useMemo(()=>storeGroups.map(store=>storePinMenu(store)).filter(menu=>isKoreanCoordinate(menu.lat,menu.lng)),[storeGroups]);
 const selectedStore=storeGroups.find(store=>store.menus.some(menu=>menu.placeId===selectedPlace));
 const visibleStores=selectedStore?[selectedStore]:listOpen?storeGroups:[];
 function updateQuery(value:string){setQuery(value);setSelectedPlace(null);if(value.trim()){setHeat(0);setFlavor('전체');setCategory('전체');setListOpen(true)}}
 function select(menu:Menu){setSelectedPlace(menu.placeId);setListOpen(false)}
 function openDetail(menu:Menu){const fields=['id','placeId','name','shop','price','image','area','ownerRegistered','lat','lng'] as const;const item=Object.fromEntries(fields.map(key=>[key,menu[key]]));postAppEvent({type:'nowgo:menu-selected',brand:variant,menu:item})}
 return <main className="nowgo-app-map" data-app-map data-flavor={variant}>
  <div className="app-map-filters" aria-label="메뉴 검색과 필터"><label className="app-map-search"><span>검색</span><input type="search" value={query} onChange={event=>updateQuery(event.target.value)} placeholder={variant==='hot'?'지역명·상호명·매운 메뉴 검색':theme.search} aria-label={variant==='hot'?'지역명·상호명·매운 메뉴 검색':'매장·메뉴 검색'}/></label><div className="app-map-selects">
  <label>{taste} 단계<select value={heat} onChange={event=>setHeat(Number(event.target.value))}><option value={0}>모든 단계</option>{theme.heat.map((label,index)=><option key={label} value={index+1}>{index+1}단계 · {label}</option>)}</select></label>
  <label>맛의 결<select value={flavor} onChange={event=>setFlavor(event.target.value)}>{theme.flavors.map(label=><option key={label} value={label}>{label==='전체'?'모든 결':label}</option>)}</select></label>
  <label>음식 카테고리<select value={category} onChange={event=>setCategory(event.target.value)}><option value="전체">모든 음식</option>{theme.categories.map(label=><option key={label} value={label}>{label}</option>)}</select></label></div></div>
  <div className="app-map-canvas"><KakaoMap sourcedStores={matchingSources} sourceIdentityStores={sourceStores} viewportCountQuery={viewportCountQuery} selectedId={selectedStore?.menus[0].id} appLocationBridge fullScreen onMapState={status=>postAppEvent({type:'nowgo:map-state',brand:variant,status,realOnly:true})} variant={variant} menus={pins} onSelect={select} onLocation={setLocation}/>
  </div>
  <section className="app-map-results" aria-label="매장 목록">
   <div className="app-map-results-toolbar"><button type="button" aria-expanded={listOpen||!!selectedStore} aria-controls="app-map-results-list" onClick={()=>{setSelectedPlace(null);setListOpen(open=>!open)}}>{selectedStore?'매장 목록 보기':listOpen?'목록 접기':`불러온 매장 ${combinedStores.length}곳 보기`}</button>{selectedStore&&<button type="button" onClick={()=>setSelectedPlace(null)} aria-label="선택한 매장 닫기">닫기 ×</button>}</div>
   <p className="sourced-store-notice">핀·목록은 불러온 자료 기준 · 메뉴 요청당 최대 100개{browseOrigin?' · 내 위치 주변 15km':''}</p>
   {variant==='hot'&&<SourcedStoreNotice state={sourceState} retry={()=>void sourceState.refresh()}/>}
   {loading?<p className="app-map-result-status" role="status">매장을 불러오는 중이에요.</p>:error?<p className="app-map-result-status" role="status">{error}<button type="button" onClick={()=>void load()}>다시 불러오기</button></p>:!combinedStores.length?<p className="app-map-result-status">{menuSearchError(query)||(query||heat||flavor!=='전체'||category!=='전체'?'조건에 맞는 매장·메뉴가 아직 없어요.':'첫 매장의 제보를 기다리고 있어요.')}<button type="button" onClick={()=>postAppEvent({type:'nowgo:open-report',brand:variant})}>유저 제보하기</button></p>:null}
   {(!!visibleStores.length||listOpen&&!!sourceOnlyStores.length)&&<div id="app-map-results-list" className="app-map-results-list">{visibleStores.map(store=><article key={store.key} className={`app-map-card-wrapper ${!store.ownerRegistered?'app-map-card--reported':''}`}><header className="app-map-store-heading"><strong>{store.menus[0].shop}</strong><span>소비자 제보 최소 {store.reportCount}건{store.reportCount>=3?' · 제보가 많은 매장':store.reportCount>1?' · 제보 누적':''}</span></header>{sourceByKey.has(store.key)&&<SourcedStoreCard store={sourceByKey.get(store.key)!} showHeading={false}/>}{store.menus.map(menu=><button key={menu.id} type="button" className="app-map-card" onClick={()=>openDetail(menu)}><span>{menu.name} · {money(menu.price)}</span>{variant==='hot'&&<small className="reported-heat-attribution">{menuHeatAttribution(menu)}</small>}<small>{menu.ownerRegistered?'공식 매장':'유저 제보 · 영업현황 확인불가'} · 상세 보기 ↗</small></button>)}<OwnerJoinRequest compact menuId={store.menus[0].id} ownerRegistered={store.ownerRegistered} appVariant={variant}/><RegularFavorite compact placeId={store.placeId} slug={store.menus[0].nowgoSlug} appVariant={variant}/></article>)}{listOpen&&sourceOnlyStores.map(store=><article key={store.id} className="app-map-card-wrapper app-map-card--reported"><SourcedStoreCard store={store}/></article>)}{hasMore&&listOpen&&<button type="button" className="app-map-card" onClick={()=>void load(page+1)}>메뉴 더 보기</button>}</div>}
  </section>
 </main>;
}
