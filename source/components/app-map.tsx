'use client';
import {useMapRegions} from './use-map-regions';
import {MAP_REGIONS,mapScopeParameters,regionForAddress,type RegionCount} from '@/lib/map-regions';
import {menuStoreGroups} from '@/lib/menu-store-groups';
import RegularFavorite from './regular-favorite';
import OwnerJoinRequest from './owner-join-request';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import KakaoMap from './kakao-map';
import {api} from '@/lib/client';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import {type Menu,money} from '@/lib/menus';
import {MAP_RADIUS_KM,type GeoPoint} from '@/lib/nearby-demo';
import {isKoreanCoordinate} from '@/lib/korean-region';
import {appParentOrigin,postAppEvent} from '@/lib/app-embed';
export default function AppMap({variant}:{variant:SiteVariant}){
 const theme=siteConfig(variant),taste=variant==='hot'?'매운맛':variant==='rich'?'느끼함':'달콤함';
 const [query,setQuery]=useState(''),[heat,setHeat]=useState(0),[flavor,setFlavor]=useState('전체'),[category,setCategory]=useState('전체');
 const [menus,setMenus]=useState<Menu[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[location,setLocation]=useState<GeoPoint|null>(null);
 const [selectedPlace,setSelectedPlace]=useState<string|null>(null),[listOpen,setListOpen]=useState(false);
 const [scope,setScope]=useState<'national'|'regional'|'nearby'>('national'),[regionId,setRegionId]=useState(''),[nationalRequest,setNationalRequest]=useState(0);
 const {summary,error:regionError}=useMapRegions();
 function nationwide(){setScope('national');setRegionId('');setSelectedPlace(null);setNationalRequest(n=>n+1)}
 function regionSelect(region:RegionCount){setScope('regional');setRegionId(region.id);setSelectedPlace(null);setListOpen(true)}
 const request=useRef(0),controller=useRef<AbortController|null>(null);
 const load=useCallback(async(nextPage=0)=>{
  const run=++request.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;
  const params=new URLSearchParams({page:String(nextPage),...mapScopeParameters(scope,regionId,location,MAP_RADIUS_KM)});if(query.trim())params.set('q',query.trim());if(heat)params.set('heat',String(heat));if(flavor!=='전체')params.set('flavor',flavor);if(category!=='전체')params.set('category',category);
  setLoading(true);setError('');try{const data=await api<{menus:Menu[];hasMore:boolean}>('/api/menus?'+params,{signal:abort.signal});if(run!==request.current)return;const real=(Array.isArray(data.menus)?data.menus:[]).filter(menu=>menu&&menu.isDemo===false);setMenus(previous=>nextPage?[...previous,...real]:real);setPage(nextPage);setHasMore(data.hasMore===true)}catch(cause){if(run!==request.current||abort.signal.aborted)return;setError(cause instanceof Error?cause.message:'매장 정보를 불러오지 못했어요.');setMenus([]);setHasMore(false)}finally{if(run===request.current)setLoading(false)}
 },[query,heat,flavor,category,location,scope,regionId]);
 const cancel=useCallback(()=>{request.current++;controller.current?.abort()},[]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),query?250:0);const refresh=()=>void load();window.addEventListener('focus',refresh);const receive=(event:MessageEvent)=>{if(event.origin!==appParentOrigin()||event.source!==window.parent)return;if(event.data?.type==='nowgo:map-refresh'){refresh();window.dispatchEvent(new Event('nowgo:map-visible'))}if(event.data?.type==='nowgo:map-probe')postAppEvent({type:'nowgo:map-frame-ready',brand:variant,realOnly:true})};window.addEventListener('message',receive);const visible=()=>{if(document.visibilityState==='visible')refresh()};const interval=setInterval(visible,30_000);window.addEventListener('nowgo:catalog-refresh',refresh);document.addEventListener('visibilitychange',visible);return()=>{clearTimeout(timer);clearInterval(interval);window.removeEventListener('nowgo:catalog-refresh',refresh);document.removeEventListener('visibilitychange',visible);cancel();window.removeEventListener('focus',refresh);window.removeEventListener('message',receive)}},[load,query,cancel,variant]);
 useEffect(()=>{postAppEvent({type:'nowgo:map-frame-ready',brand:variant,realOnly:true})},[variant]);
 const matched=useMemo(()=>menus.filter(menu=>(!heat||menu.heat===heat)&&(flavor==='전체'||menu.flavor===flavor)&&(category==='전체'||menu.category===category)&&`${menu.name} ${menu.shop} ${menu.area}`.replace(/\s/g,'').includes(query.trim().replace(/\s/g,''))),[menus,heat,flavor,category,query]);
 const storeGroups=useMemo(()=>menuStoreGroups(matched),[matched]);
 const pins=useMemo(()=>storeGroups.map(store=>store.menus[0]).filter(menu=>isKoreanCoordinate(menu.lat,menu.lng)),[storeGroups]);
 const selectedStore=storeGroups.find(store=>store.menus.some(menu=>menu.placeId===selectedPlace));
 const visibleStores=selectedStore?[selectedStore]:listOpen?storeGroups:[];
 function select(menu:Menu){if(scope==='national'){setScope('regional');setRegionId(regionForAddress(menu.area)?.id||'')}setSelectedPlace(menu.placeId);setListOpen(false)}
 function openDetail(menu:Menu){const fields=['id','placeId','name','shop','price','image','area','ownerRegistered','lat','lng'] as const;const item=Object.fromEntries(fields.map(key=>[key,menu[key]]));postAppEvent({type:'nowgo:menu-selected',brand:variant,menu:item})}
 return <main className="nowgo-app-map" data-app-map data-flavor={variant}>
  <div className="app-map-filters" aria-label="메뉴 검색과 필터"><label className="app-map-search"><span>검색</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={theme.search} aria-label="매장·메뉴 검색"/></label><div className="app-map-selects">
  <label>{taste} 단계<select value={heat} onChange={event=>setHeat(Number(event.target.value))}><option value={0}>모든 단계</option>{theme.heat.map((label,index)=><option key={label} value={index+1}>{index+1}단계 · {label}</option>)}</select></label>
  <label>맛의 결<select value={flavor} onChange={event=>setFlavor(event.target.value)}>{theme.flavors.map(label=><option key={label} value={label}>{label==='전체'?'모든 결':label}</option>)}</select></label>
  <label>음식 카테고리<select value={category} onChange={event=>setCategory(event.target.value)}><option value="전체">모든 음식</option>{theme.categories.map(label=><option key={label} value={label}>{label}</option>)}</select></label></div></div>
  <div className="app-map-canvas"><button type="button" className="map-national-button" onClick={nationwide} aria-pressed={scope==='national'}>전국 보기</button><KakaoMap selectedId={selectedStore?.menus[0].id} appLocationBridge fullScreen onMapState={status=>postAppEvent({type:'nowgo:map-state',brand:variant,status,realOnly:true})} variant={variant} menus={pins} onSelect={select} onLocation={point=>{setLocation(point);setScope('nearby');setRegionId('')}} nationalView={scope==='national'} nationalRequest={nationalRequest} regionCounts={summary?.regions} onRegionSelect={regionSelect} onNationwide={nationwide} focusRegion={scope==='regional'?MAP_REGIONS.find(region=>region.id===regionId):undefined}/>
  </div>
  <section className="app-map-results" aria-label="매장 목록">
   <p className="app-map-result-status" role="status">{scope==='national'?(regionError||(!summary?'지역별 매장 수를 불러오는 중이에요.':`전국 ${summary.total}곳 · 전체 등록 매장${summary.unassigned?` · 지역 미확인 ${summary.unassigned}곳`:''}`)):scope==='regional'?`${MAP_REGIONS.find(region=>region.id===regionId)?.name||'지역'} 등록 매장`:'내 주변 15km'}</p>
   <div className="app-map-results-toolbar"><button type="button" aria-expanded={listOpen||!!selectedStore} aria-controls="app-map-results-list" onClick={()=>{setSelectedPlace(null);setListOpen(open=>!open)}}>{selectedStore?'매장 목록 보기':listOpen?'목록 접기':`불러온 매장 ${storeGroups.length}곳${hasMore?' 이상':''} 보기`}</button>{selectedStore&&<button type="button" onClick={()=>setSelectedPlace(null)} aria-label="선택한 매장 닫기">닫기 ×</button>}</div>
   {loading?<p className="app-map-result-status" role="status">매장을 불러오는 중이에요.</p>:error?<p className="app-map-result-status" role="status">{error}<button type="button" onClick={()=>void load()}>다시 불러오기</button></p>:!matched.length?<p className="app-map-result-status">{query||heat||flavor!=='전체'||category!=='전체'?'조건에 맞는 매장·메뉴가 아직 없어요.':'첫 매장의 제보를 기다리고 있어요.'}<button type="button" onClick={()=>postAppEvent({type:'nowgo:open-report',brand:variant})}>유저 제보하기</button></p>:null}
   {!!visibleStores.length&&<div id="app-map-results-list" className="app-map-results-list">{visibleStores.map(store=><article key={store.placeId} className={`app-map-card-wrapper ${!store.ownerRegistered?'app-map-card--reported':''}`}><header className="app-map-store-heading"><strong>{store.menus[0].shop}</strong><span>소비자 제보 {store.reportCount}건{store.reportCount>=3?' · 제보가 많은 매장':store.reportCount>1?' · 제보 누적':''}</span></header>{store.menus.map(menu=><button key={menu.id} type="button" className="app-map-card" onClick={()=>openDetail(menu)}><span>{menu.name} · {money(menu.price)}</span><small>{menu.ownerRegistered?'공식 매장':'유저 제보 · 영업현황 확인불가'} · 상세 보기 ↗</small></button>)}<OwnerJoinRequest compact menuId={store.menus[0].id} ownerRegistered={store.ownerRegistered} appVariant={variant}/><RegularFavorite compact placeId={store.placeId} slug={store.menus[0].nowgoSlug} appVariant={variant}/></article>)}{hasMore&&listOpen&&<button type="button" className="app-map-card" onClick={()=>void load(page+1)}>메뉴 더 보기</button>}</div>}
  </section>
 </main>;
}

