'use client';
import {menuStoreGroups} from '@/lib/menu-store-groups';
import OwnerJoinRequest from '@/components/owner-join-request';
import StoreStatus from '@/components/store-status';
import RegularFavorite from '@/components/regular-favorite';
import BookingActions from '@/components/booking-actions';
import Brand from '@/components/brand';
import {useEffect,useMemo,useRef,useState} from 'react';import {Search,X,MapPin,Plus,ArrowUpRight,ChevronDown,ChevronUp,RotateCcw,Navigation} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {NativeSelect} from '@/components/ui/native-select';
import CustomerPanel from './customer-panel';
import ReporterLeaderboard from './reporter-leaderboard';
import MapChat from './map-chat';
import VisitActions from './activity/visit-actions';
import NaverMap,{type NaverMapHandle} from './naver-map';
import {locationStatusText,type LocationState} from '@/lib/request-current-location';
import FirstLoginTour from './first-login-tour';
import {mapMenuCatalog} from '@/lib/map-menu-catalog';
import {MAP_RADIUS_KM,type GeoPoint} from '@/lib/nearby-demo';
import {money,type Menu} from '@/lib/menus';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import {api,track} from '@/lib/client';
import {displayTasteLevel,tastePinPosition} from '@/lib/taste-level';
import {regionSearchQuery} from '@/lib/region-search';
import LocalAdSlot from '@/components/local-ad-slot';
function DetailTastePrice({variant,level,price,isDemo,verifiedOwner}:{variant:SiteVariant;level:number;price:number;isDemo:boolean;verifiedOwner?:boolean}){
 const stage=displayTasteLevel(variant,level);
 const priceNote=isDemo?'예시':verifiedOwner?'공식 점주 제보 가격':'고객 제보 가격';
 return <div className="explorer-taste-price" aria-label={`${variant.toUpperCase()} ${stage}단계, ${money(price)}, ${priceNote}`}>
  <span className="explorer-taste-icon" aria-hidden="true" style={{backgroundPosition:tastePinPosition(variant,stage)}}/>
  <span className="explorer-taste-level">{stage}단계</span><strong>{money(price)} <small>{priceNote}</small></strong>
 </div>;
}
export default function MapExplorer({variant='hot'}:{variant?:SiteVariant}){
 const theme=siteConfig(variant),MENUS=theme.menus,HEAT=theme.heat,FLAVORS=theme.flavors,CATEGORIES=['전체',...theme.categories],tasteLabel=variant==='hot'?'매운맛':variant==='rich'?'느끼함':'달콤함',categoryLabel=variant==='hot'?'매운맛 메뉴':variant==='rich'?'느끼한 메뉴':'달콤한 디저트';
 useEffect(()=>{if(['#report','#owner','#photo-credits','#discover'].includes(location.hash))location.replace('/suggestion'+location.hash)},[]);
 const [reportedMenu,setReportedMenu]=useState<Menu|null>(null);
 useEffect(()=>{let cancelled=false;const reveal=(id:string)=>{if(!id)return;void api<{menu:Menu}>(`/api/menu?id=${encodeURIComponent(id)}`).then(d=>{if(!cancelled){setReportedMenu(d.menu);setSelected(d.menu);setExpanded(true)}}).catch(()=>{})};reveal(new URLSearchParams(location.search).get('report')||'');const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nowgo-catalog'):null;if(channel)channel.onmessage=event=>{if(event.data?.brand===variant&&typeof event.data?.menuId==='string')reveal(event.data.menuId)};return()=>{cancelled=true;channel?.close()}},[variant]);
 const [worldEntryOpen,setWorldEntryOpen]=useState(true);
 const locationControl=useRef<NaverMapHandle>(null);
 const [locationState,setLocationState]=useState<LocationState>('idle');
 const locationBusy=locationState==='locating'||locationState==='retrying';
 const locationFailed=!['idle','locating','retrying','located'].includes(locationState);
 const requestLocation=()=>locationControl.current?.requestLocation();
 const [catalog,setCatalog]=useState<Menu[]>(MENUS),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [query,setQuery]=useState(''),[heat,setHeat]=useState(0),[flavor,setFlavor]=useState('전체'),[category,setCategory]=useState('전체'),[budget,setBudget]=useState(0),[selected,setSelected]=useState<Menu|null>(null),[expanded,setExpanded]=useState(true),[userLocation,setUserLocation]=useState<GeoPoint|null>(null);
 const [regionSearch,setRegionSearch]=useState<{text:string;requestId:number}|null>(null),[resolvedRegion,setResolvedRegion]=useState(''),[regionNote,setRegionNote]=useState('');
 const searchedRegion=regionSearchQuery(query);
 const menuQuery=resolvedRegion===query.trim()?'':query;
 useEffect(()=>{if(!searchedRegion)return;const timer=setTimeout(()=>{setRegionNote('지역을 찾고 있습니다.');setRegionSearch({text:searchedRegion,requestId:Date.now()})},450);return()=>clearTimeout(timer)},[searchedRegion]);
 const parameters=(nextPage:number)=>{const p=new URLSearchParams({page:String(nextPage)});if(menuQuery)p.set('q',menuQuery);if(heat)p.set('heat',String(heat));if(flavor!=='전체')p.set('flavor',flavor);if(category!=='전체')p.set('category',category);if(budget)p.set('budget',String(budget));if(userLocation){p.set('lat',String(userLocation.lat));p.set('lng',String(userLocation.lng));p.set('radiusKm',String(MAP_RADIUS_KM))}return p};
 const load=(nextPage:number)=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${parameters(nextPage)}`).then(d=>{setCatalog(old=>nextPage?[...old,...d.menus]:[...MENUS,...d.menus]);setPage(nextPage);setHasMore(d.hasMore)});
 useEffect(()=>{let cancelled=false;const p=parameters(0);const refresh=()=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${p}`).then(d=>{if(!cancelled){setCatalog([...MENUS,...d.menus]);setPage(0);setHasMore(d.hasMore)}}).catch(()=>{});const timer=setTimeout(refresh,query?250:0);window.addEventListener('focus',refresh);const visible=()=>{if(document.visibilityState==='visible')void refresh()};const interval=setInterval(visible,30_000);document.addEventListener('visibilitychange',visible);window.addEventListener('nowgo-activity-change',refresh);const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nowgo-catalog'):null;if(channel)channel.onmessage=event=>{if(event.data?.brand===variant)void refresh()};return()=>{cancelled=true;clearTimeout(timer);clearInterval(interval);document.removeEventListener('visibilitychange',visible);window.removeEventListener('nowgo-activity-change',refresh);channel?.close();window.removeEventListener('focus',refresh)}},[query,menuQuery,heat,flavor,category,budget,userLocation]);
 const locatedCatalog=useMemo(()=>mapMenuCatalog(catalog,userLocation),[catalog,userLocation]);
 const matching=useMemo(()=>locatedCatalog.filter(m=>(!heat||m.heat===heat)&&(flavor==='전체'||m.flavor===flavor)&&(category==='전체'||m.category===category)&&(!budget||m.price<=budget)&&`${m.name} ${m.shop} ${m.category} ${m.area}`.replace(/\s/g,'').includes(menuQuery.trim().replace(/\s/g,''))),[locatedCatalog,menuQuery,heat,flavor,category,budget]);
 const filtered=useMemo(()=>reportedMenu?[reportedMenu,...matching.filter(m=>m.id!==reportedMenu.id)]:matching,[reportedMenu,matching]);
 const storeGroups=useMemo(()=>menuStoreGroups(filtered),[filtered]);
 const current=selected?(selected.isAd?selected:filtered.find(m=>m.id===selected.id)||null):null;
 const count=Number(!!heat)+Number(flavor!=='전체')+Number(category!=='전체')+Number(!!budget);
 function reset(){setReportedMenu(null);setQuery('');setResolvedRegion('');setRegionSearch(null);setRegionNote('');setHeat(0);setFlavor('전체');setCategory('전체');setBudget(0);setSelected(null)}
 useEffect(()=>{track('map_open','map')},[]);
 function select(m:Menu){setSelected(m);setExpanded(true);track('menu_detail_open',m.id)}
 function collapseSelected(){setSelected(null);setExpanded(false)}
 const directionsUrl=(menu:Menu)=>menu.lat!==null&&menu.lng!==null?'https://map.naver.com/p/search/'+encodeURIComponent(menu.shop+' '+menu.area):null;
 return <main className="explorer">
  <header className="explorer-toolbar">
   <div className="explorer-topline"><Brand/><div className="explorer-search"><Search size={21}/><Input aria-label={`${theme.name} 메뉴 검색`} value={query} onChange={e=>{setReportedMenu(null);setQuery(e.target.value)}} placeholder="지역 또는 메뉴 검색 · 예: 성수동, 닭발"/>{query&&<Button variant="ghost" size="icon" aria-label="검색어 지우기" onClick={()=>setQuery('')}><X size={18}/></Button>}</div><span className="explorer-region"><MapPin size={16}/>{userLocation?'주변 15km':'제보된 매장'} <small>{theme.name}</small></span><CustomerPanel variant={variant} regularHref={`https://nowgo.space/regular/home?flavor=${variant}`} worldEntryOpen={worldEntryOpen} onWorldEntryClose={()=>setWorldEntryOpen(false)}/></div>
   <div className="explorer-filters" aria-label="메뉴 검색 조건">
    <label>{tasteLabel+' 단계'}<NativeSelect aria-label={tasteLabel+' 단계'} value={heat} onChange={e=>{setReportedMenu(null);setHeat(Number(e.target.value))}}><option value={0}>{'모든 '+tasteLabel}</option>{HEAT.map((h,i)=><option key={h} value={i+1}>{i+1}단계 · {h}</option>)}</NativeSelect></label>
    <label>{tasteLabel+' 카테고리'}<NativeSelect aria-label={tasteLabel+' 카테고리'} value={flavor} onChange={e=>{setReportedMenu(null);setFlavor(e.target.value)}}>{FLAVORS.map(f=><option key={f} value={f}>{f==='전체'?'모든 맛의 결':f}</option>)}</NativeSelect></label>
    <label>{categoryLabel}<NativeSelect aria-label={categoryLabel} value={category} onChange={e=>{setReportedMenu(null);setCategory(e.target.value)}}>{CATEGORIES.map(c=><option key={c} value={c}>{c==='전체'?'모든 메뉴':c}</option>)}</NativeSelect></label>
    <label className={budget?'budget-active':''}>한 끼 예산<NativeSelect aria-label="한 끼 예산" value={budget} onChange={e=>{setReportedMenu(null);setBudget(Number(e.target.value))}}><option value={0}>예산 전체</option><option value={10000}>1만 원 이하</option><option value={15000}>1만 5천 원 이하</option><option value={20000}>2만 원 이하</option></NativeSelect></label>
    <Button className="explorer-reset" variant="ghost" onClick={reset} disabled={!count&&!query&&!reportedMenu}><RotateCcw size={15}/>초기화{count>0&&<span>{count}</span>}</Button>
   </div>
  </header>
  <div className="explorer-surface"><ReporterLeaderboard variant={variant}/>
   <NaverMap densityQuery={variant==='hot'?parameters(0).toString():undefined} fullScreen menus={storeGroups.map(store=>store.menus[0])} selectedId={current?.id} onSelect={select} locationControl={locationControl} onLocationState={setLocationState} onLocation={point=>{setUserLocation(point);setResolvedRegion('');setRegionSearch(null);setRegionNote('')}} addressSearch={regionSearch} onAddressFound={point=>{if(regionSearch?.text!==regionSearchQuery(query))return;setUserLocation({lat:point.lat,lng:point.lng});setResolvedRegion(query.trim());setSelected(null);setReportedMenu(null);setRegionNote(point.address+' 주변으로 이동했습니다.')}} onAddressError={()=>setRegionNote('지역을 찾지 못했습니다. 시·구와 동 이름을 함께 입력해 주세요.')} variant={variant}/>
      <aside className={`explorer-results ${expanded?'expanded':'collapsed'} ${current?'has-selection':''}`} style={current?{top:0,bottom:0,maxHeight:'none'}:undefined} aria-label="검색된 메뉴">
    <div className="explorer-results-header">
    <button className="explorer-results-heading" aria-expanded={expanded} aria-controls="map-results" onClick={()=>current?collapseSelected():setExpanded(!expanded)}><span><small>{userLocation?'내 주변 매장 · 메뉴':'등록된 매장 · 메뉴'}</small><strong>지금 당기는 한 접시 <b>{filtered.length}</b></strong></span>{expanded?<ChevronDown size={20}/>:<ChevronUp size={20}/>}</button>
     <a className="explorer-report explorer-report--inline" href="/suggestion#report"><Plus size={16}/><span>제보 및 등록</span></a>
    </div>
    {expanded&&<div id="map-results" className="explorer-results-body">{regionNote&&<p className="explorer-example" role="status">{regionNote}</p>}{(locationBusy||locationFailed)&&<p className="explorer-example" role="status">{locationStatusText[locationState]}</p>}
        {current?<article className={`explorer-selected ${!current.isDemo&&!current.ownerRegistered?'reporter-store':''}`}><Button variant="ghost" className="explorer-back" onClick={()=>setSelected(null)}>← 메뉴 목록</Button><div className="local-ad-photo"><img className="explorer-detail-photo" src={current.image} alt={`${current.name} ${current.isDemo?'참고 사진':'제보 사진'}`}/>{current.isAd&&<span className="local-ad-badge">광고</span>}</div><div className="explorer-detail-content"><span className="explorer-tags">{current.flavor} · {HEAT[current.heat-1]}</span><h1>{current.name}</h1>{current.soldout&&<p className="menu-soldout-badge" role="status">현재 품절된 메뉴입니다.</p>}<DetailTastePrice variant={variant} level={current.heat} price={current.price} isDemo={current.isDemo} verifiedOwner={current.verifiedOwner}/><p>{current.description}</p>{current.nowgoSlug&&!current.isDemo?<a className="explorer-owner-minihome" href={`${process.env.NEXT_PUBLIC_NOWGO_SITE_URL||'https://nowgo-space-home.vercel.app'}/p/${encodeURIComponent(current.nowgoSlug)}`} target="_blank" rel="noopener noreferrer">이 매장 미니홈피 보기 ↗</a>:null}<StoreStatus key={current.id} menuId={current.id} isDemo={current.isDemo} ownerRegistered={current.ownerRegistered}/><OwnerJoinRequest key={current.placeId} menuId={current.id} isDemo={current.isDemo} ownerRegistered={current.ownerRegistered}/><RegularFavorite key={current.placeId} placeId={current.placeId} slug={current.nowgoSlug} isDemo={current.isDemo}/><VisitActions placeId={current.ownerStoreId?'nowgo-'+current.ownerStoreId:current.placeId} isDemo={current.isDemo}/><div className="explorer-quick-actions" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,margin:'16px 0 4px'}} aria-label="매장 이용 정보">{directionsUrl(current)?<a className="explorer-action explorer-action--primary" style={{minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,border:'1px solid #bd3828',borderRadius:8,background:'#bd3828',color:'#fff',fontSize:13,fontWeight:700,lineHeight:1.2,textDecoration:'none'}} href={directionsUrl(current)!} target="_blank" rel="noreferrer" onClick={()=>track('directions_open',current.placeId)}><Navigation size={18}/><span>네이버 지도</span></a>:<button type="button" className="explorer-action" style={{minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,border:'1px solid #ded8ce',borderRadius:8,background:'#fbfaf6',color:'#766f64',fontSize:13,fontWeight:700,lineHeight:1.2,cursor:locationBusy?'wait':'pointer'}} disabled={locationBusy} onClick={requestLocation}><Navigation size={18}/><span>{locationBusy?'내 위치 확인 중':userLocation?'지도 위치 재확인':'내 위치 확인'}</span></button>}<BookingActions placeId={current.placeId} isDemo={current.isDemo} variant={variant} storeName={current.shop}/></div></div></article>:
    <div className="explorer-menu-list">{variant==='hot'&&<LocalAdSlot point={userLocation} onSelect={select}/>}{storeGroups.map(store=><article key={store.placeId} className={!store.menus[0].isDemo&&!store.ownerRegistered?'reporter-store':undefined}><header className="explorer-store-name"><strong>{store.menus[0].shop}</strong><span className="store-report-count">소비자 제보 {store.reportCount}건{store.reportCount>=3?' · 제보가 많은 매장':store.reportCount>1?' · 제보 누적':''}</span></header>{store.menus.map(m=><div key={m.id}><button type="button" className={`explorer-menu-item ${!m.isDemo&&!m.ownerRegistered?'reporter-store':''}`} onClick={()=>select(m)}><img src={m.image} alt={`${m.name} ${m.isDemo?'메뉴 참고 사진':'제보 사진'}`} width={84} height={84}/><span className="explorer-item-copy"><small>{m.flavor} · {HEAT[m.heat-1]}</small><strong>{m.verifiedOwner?'[공식 점주] ':''}{m.name}</strong><span>{money(m.price)} <small>{m.isDemo?'예시':m.verifiedOwner?'공식 점주':'제보'}</small></span>{!m.isDemo&&!m.ownerRegistered?<small className="reporter-store-status">제보자 등록매장 · 점주 영업현황 미등록</small>:null}</span><ArrowUpRight size={17}/></button></div>)}<OwnerJoinRequest key={store.placeId} compact menuId={store.menus[0].id} isDemo={store.menus[0].isDemo} ownerRegistered={store.ownerRegistered}/>{!store.menus[0].isDemo&&<RegularFavorite compact placeId={store.placeId} slug={store.menus[0].nowgoSlug} isDemo={false}/>}</article>)}{!filtered.length&&<div className="explorer-empty"><MapPin size={27}/><h2>조건에 맞는 메뉴가 없어요</h2><p>검색어나 필터를 바꿔 주세요.</p><Button variant="outline" onClick={reset}>조건 초기화</Button></div>}</div>}{hasMore&&<Button variant="outline" onClick={()=>void load(page+1)}>메뉴 더 보기</Button>}
   </div>}
   </aside>
   <a className="explorer-report explorer-report--floating" href="/suggestion#report"><Plus size={22}/><span>제보 및 등록</span><ArrowUpRight size={19}/></a>
   <MapChat variant={variant}/>
  </div>
  {!worldEntryOpen&&<FirstLoginTour taste={variant} page="map"/>}
 </main>
}


