'use client';
import type {PublicSourcedStore} from '@/lib/sourced-store';
import {menuHeatAttribution} from '@/lib/menu-heat-attribution';
import {previewMenuHeat,replacePreviewHeat,type PreviewHeatVotes} from '@/lib/preview-menu-heat';
import {mapStoreGroups,sourcedStoreMatches,sourcedStoresNearby} from '@/lib/map-sourced-stores';
import OwnerJoinRequest from '@/components/owner-join-request';
import StoreStatus from '@/components/store-status';
import {useSourcedStores} from '@/hooks/use-sourced-stores';
import SourcedStoreCard from '@/components/sourced-store-card';
import SourcedStoreDetail from '@/components/sourced-store-detail';
import {validatePreviewPhoto} from '@/components/preview-photo-report';
import './sourced-store-minihome.css';
import SourcedStoreNotice from '@/components/sourced-store-notice';
import RegularFavorite from '@/components/regular-favorite';
import BookingActions from '@/components/booking-actions';
import Brand from '@/components/brand';
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';import {Search,X,MapPin,Plus,ArrowUpRight,ChevronDown,ChevronUp,RotateCcw,Navigation} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {NativeSelect} from '@/components/ui/native-select';
import CustomerPanel from './customer-panel';
import ReporterLeaderboard from './reporter-leaderboard';
import MapChat from './map-chat';
import VisitActions from './activity/visit-actions';
import KakaoMap,{type KakaoMapHandle} from './kakao-map';
import {locationStatusText,type LocationState} from '@/lib/request-current-location';
import FirstLoginTour from './first-login-tour';
import {mapMenuCatalog} from '@/lib/map-menu-catalog';
import {type GeoPoint} from '@/lib/nearby-demo';
import {mapBrowseOrigin,appendMapBrowseLocation} from '@/lib/map-browse-scope';
import {money,type Menu} from '@/lib/menus';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import {api,track} from '@/lib/client';
function DetailTastePrice({variant,level,price,isDemo,verifiedOwner}:{variant:SiteVariant;level:number;price:number;isDemo:boolean;verifiedOwner?:boolean}){
 const stage=Math.min(5,Math.max(1,Math.trunc(level)||1));
 const row=variant==='sweet'?50:variant==='rich'?100:0;
 const priceNote=isDemo?'예시':verifiedOwner?'공식 점주 제보 가격':'고객 제보 가격';
 return <div className="explorer-taste-price" aria-label={`${variant.toUpperCase()} ${stage}단계, ${money(price)}, ${priceNote}`}>
  <span className="explorer-taste-icon" aria-hidden="true" style={{backgroundPosition:`${(stage-1)*25}% ${row}%`}}/>
  <strong>{money(price)} <small>{priceNote}</small></strong>
 </div>;
}
export default function MapExplorer({variant='hot',previewStore,initialSourceStore}:{variant?:SiteVariant;previewStore?:PublicSourcedStore;initialSourceStore?:PublicSourcedStore}){
 const theme=siteConfig(variant),MENUS=previewStore?[]:theme.menus,HEAT=theme.heat,FLAVORS=theme.flavors,CATEGORIES=['전체',...theme.categories],tasteLabel=variant==='hot'?'매운맛':variant==='rich'?'느끼함':'달콤함',categoryLabel=variant==='hot'?'매운맛 메뉴':variant==='rich'?'느끼한 메뉴':'달콤한 디저트';
 useEffect(()=>{if(previewStore)return;if(['#report','#owner','#photo-credits','#discover'].includes(location.hash))location.replace('/suggestion'+location.hash)},[previewStore]);
 const [reportedMenu,setReportedMenu]=useState<Menu|null>(null);
 const [previewHeatVotes,setPreviewHeatVotes]=useState<PreviewHeatVotes>({});
 const [previewPhotos,setPreviewPhotos]=useState<Record<string,{url:string;nickname:string}>>({});
 const [previewFavorite,setPreviewFavorite]=useState(false);
 const photoUrls=useRef(new Set<string>());
 useEffect(()=>{const active=new Set(Object.values(previewPhotos).map(photo=>photo.url));for(const url of photoUrls.current){if(!active.has(url)){URL.revokeObjectURL(url);photoUrls.current.delete(url)}}},[previewPhotos]);
 useEffect(()=>{const urls=photoUrls.current;return()=>{for(const url of urls)URL.revokeObjectURL(url);urls.clear()}},[]);
 const [selectedSource,setSelectedSource]=useState<PublicSourcedStore|null>(initialSourceStore||null);
 const [selectedSourceMenuId,setSelectedSourceMenuId]=useState<string|null>(initialSourceStore?.menus[0]?.id||null);
 const resultsBody=useRef<HTMLDivElement>(null),listScrollTop=useRef(0);
 const searchRow=useRef<HTMLDivElement>(null);
 const [mobileDetailTop,setMobileDetailTop]=useState(0);
 const sheet=useRef<HTMLElement>(null);
 const sheetOffset=useRef(0);
 const moveSheet=(offset:number)=>{sheetOffset.current=offset;sheet.current?.style.setProperty('--explorer-sheet-offset',`${offset}px`)};
 const sheetTouch=useRef<number|null>(null);
 useEffect(()=>{const row=searchRow.current;if(!row)return;const measure=()=>setMobileDetailTop(row.getBoundingClientRect().bottom);measure();const observer=new ResizeObserver(measure);observer.observe(row);window.addEventListener('resize',measure);return()=>{observer.disconnect();window.removeEventListener('resize',measure)}},[]);
 const listFocus=useRef<{kind:'menu'|'source';id:string}|null>(null);
 const [worldEntryOpen,setWorldEntryOpen]=useState(true);
 const locationControl=useRef<KakaoMapHandle>(null);
 const [locationState,setLocationState]=useState<LocationState>('idle');
 const locationBusy=locationState==='locating'||locationState==='retrying';
 const locationFailed=!['idle','locating','retrying','located'].includes(locationState);
 const requestLocation=()=>locationControl.current?.requestLocation();
 const [catalog,setCatalog]=useState<Menu[]>(MENUS),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [query,setQuery]=useState(''),[heat,setHeat]=useState(0),[flavor,setFlavor]=useState('전체'),[category,setCategory]=useState('전체'),[budget,setBudget]=useState(0),[selected,setSelected]=useState<Menu|null>(null),[expanded,setExpanded]=useState(true),[userLocation,setUserLocation]=useState<GeoPoint|null>(null);
 useEffect(()=>{if(previewStore)return;let cancelled=false;const reveal=(id:string)=>{if(!id)return;void api<{menu:Menu}>(`/api/menu?id=${encodeURIComponent(id)}`).then(d=>{if(!cancelled){setReportedMenu(d.menu);setSelectedSource(null);setSelected(d.menu);setExpanded(true)}}).catch(()=>{})};reveal(new URLSearchParams(location.search).get('report')||'');const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nowgo-catalog'):null;if(channel)channel.onmessage=event=>{if(event.data?.brand===variant&&typeof event.data?.menuId==='string')reveal(event.data.menuId)};return()=>{cancelled=true;channel?.close()}},[variant,previewStore]);
 // HOT location centers the map; it never silently narrows discovery.
 const browseOrigin=mapBrowseOrigin(variant,userLocation);
 const parameters=(nextPage:number)=>{const p=new URLSearchParams({page:String(nextPage)});if(query)p.set('q',query);if(heat)p.set('heat',String(heat));if(flavor!=='전체')p.set('flavor',flavor);if(category!=='전체')p.set('category',category);if(budget)p.set('budget',String(budget));appendMapBrowseLocation(p,variant,userLocation);return p};
 const load=(nextPage:number)=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${parameters(nextPage)}`).then(d=>{setCatalog(old=>nextPage?[...old,...d.menus]:[...MENUS,...d.menus]);setPage(nextPage);setHasMore(d.hasMore)});
 useEffect(()=>{if(previewStore)return;let cancelled=false;const p=parameters(0);const refresh=()=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${p}`).then(d=>{if(!cancelled){setCatalog([...MENUS,...d.menus]);setPage(0);setHasMore(d.hasMore)}}).catch(()=>{});const timer=setTimeout(refresh,query?250:0);window.addEventListener('focus',refresh);const visible=()=>{if(document.visibilityState==='visible')void refresh()};const interval=setInterval(visible,30_000);document.addEventListener('visibilitychange',visible);window.addEventListener('nowgo-activity-change',refresh);const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nowgo-catalog'):null;if(channel)channel.onmessage=event=>{if(event.data?.brand===variant)void refresh()};return()=>{cancelled=true;clearTimeout(timer);clearInterval(interval);document.removeEventListener('visibilitychange',visible);window.removeEventListener('nowgo-activity-change',refresh);channel?.close();window.removeEventListener('focus',refresh)}},[query,heat,flavor,category,budget,browseOrigin,variant,previewStore]);
 const previewFeed=useMemo(()=>previewStore?{stores:[previewStore],complete:true,asOf:previewStore.source.checkedAt}:undefined,[previewStore]);
 // Seed SSR without enabling the preview bypass for a live direct-link route.
 const initialSourceFeed=useMemo(()=>initialSourceStore?{stores:[initialSourceStore],complete:false,asOf:initialSourceStore.source.checkedAt}:undefined,[initialSourceStore]);
 const sourceState=useSourcedStores(variant,previewFeed,initialSourceFeed);
 const sourceStores=useMemo(()=>sourceState.feed?.stores||[],[sourceState.feed]);
 const matchingSources=useMemo(()=>sourcedStoresNearby(sourceStores,browseOrigin).filter(store=>sourcedStoreMatches(store,{query,heat,flavor,category,budget:budget})),[sourceStores,browseOrigin,query,heat,flavor,category,budget]);
 const viewportCountQuery=useMemo(()=>new URLSearchParams({variant,q:query,heat:String(heat),flavor,category,budget:String(budget)}).toString(),[variant,query,heat,flavor,category,budget]);
 const locatedCatalog=useMemo(()=>mapMenuCatalog(catalog,browseOrigin),[catalog,browseOrigin]);
 const matching=useMemo(()=>locatedCatalog.filter(m=>(!heat||m.heat===heat)&&(flavor==='전체'||m.flavor===flavor)&&(category==='전체'||m.category===category)&&(!budget||m.price<=budget)&&`${m.name} ${m.shop} ${m.category} ${m.area}`.replace(/\s/g,'').includes(query.trim().replace(/\s/g,''))),[locatedCatalog,query,heat,flavor,category,budget]);
 const filtered=useMemo(()=>reportedMenu?[reportedMenu,...matching.filter(m=>m.id!==reportedMenu.id)]:matching,[reportedMenu,matching]);
 const combinedStores=useMemo(()=>mapStoreGroups(filtered,matchingSources,sourceStores),[filtered,matchingSources,sourceStores]);
 const storeGroups=useMemo(()=>combinedStores.flatMap(group=>group.catalog?[group.catalog]:[]),[combinedStores]);
 const sourceOnlyStores=useMemo(()=>combinedStores.flatMap(group=>!group.catalog&&group.source?[group.source]:[]),[combinedStores]);
 const sourceByKey=useMemo(()=>new Map(combinedStores.flatMap(group=>group.source&&!group.catalog?.ownerClaimVerified?[[group.key,group.source] as const]:[])),[combinedStores]);
 const current=selected?filtered.find(m=>m.id===selected.id)||null:null;
 const currentSource=selectedSource?matchingSources.find(store=>store.id===selectedSource.id)||null:null;
 const previewHeatMenuId=previewStore?.menus.find(menu=>menu.id===selectedSourceMenuId)?.id||previewStore?.menus[0]?.id;
 const localHeat=useMemo(()=>previewStore&&previewHeatMenuId?previewMenuHeat(previewHeatVotes,previewStore,previewHeatMenuId):undefined,[previewStore,previewHeatMenuId,previewHeatVotes]);
 const hasSelection=!!(current||currentSource);
 useEffect(()=>{const body=resultsBody.current;if(!body)return;body.scrollTop=hasSelection?0:listScrollTop.current;const target=listFocus.current;if(!hasSelection&&expanded&&target){const row=Array.from(body.querySelectorAll<HTMLButtonElement>('[data-menu-id],[data-source-menu-id]')).find(node=>(target.kind==='source'?node.dataset.sourceMenuId:node.dataset.menuId)===target.id);row?.focus({preventScroll:true})}},[current?.id,currentSource?.id,selectedSourceMenuId,hasSelection,expanded]);
 const count=Number(!!heat)+Number(flavor!=='전체')+Number(category!=='전체')+Number(!!budget);
 function reset(){setReportedMenu(null);setQuery('');setHeat(0);setFlavor('전체');setCategory('전체');setBudget(0);setSelected(null);setSelectedSource(null);listScrollTop.current=0}
 useEffect(()=>{if(!previewStore)track('map_open','map')},[previewStore]);
 function rememberList(target:{kind:'menu'|'source';id:string}){if(!hasSelection){listScrollTop.current=resultsBody.current?.scrollTop||0;listFocus.current=target}}
 function select(m:Menu){rememberList({kind:'menu',id:m.id});setSelectedSource(null);setSelected(m);setExpanded(true);if(!previewStore)track('menu_detail_open',m.id)}
 function selectSource(store:PublicSourcedStore,menuId?:string){const id=store.menus.find(menu=>menu.id===menuId)?.id||store.menus[0]?.id||null;rememberList({kind:'source',id:id||store.id});setSelected(null);setSelectedSource(store);setSelectedSourceMenuId(id);setExpanded(true)}
 function submitPreviewHeat(menuId:string,heat:number){if(!previewStore||currentSource?.id!==previewStore.id)return;setPreviewHeatVotes(old=>replacePreviewHeat(old,previewStore,menuId,heat));setSelectedSourceMenuId(menuId)}
 function resetPreviewHeat(){if(previewStore)setPreviewHeatVotes({})}
 function submitPreviewPhoto(menuId:string,file:File,nickname:string){
  if(!previewStore||currentSource?.id!==previewStore.id)throw Error('preview_store_not_selected');
  const result=validatePreviewPhoto(previewStore.menus,{menuId,file,nickname});
  if(!result.ok)throw Error('invalid_preview_photo');
  const url=URL.createObjectURL(result.file);photoUrls.current.add(url);setPreviewPhotos(old=>({...old,[result.menuId]:{url,nickname:result.nickname}}));setSelectedSourceMenuId(result.menuId);
 }
 function resetPreviewPhoto(){if(previewStore&&previewHeatMenuId)setPreviewPhotos(old=>{const next={...old};delete next[previewHeatMenuId];return next})}
 function togglePreviewFavorite(){if(previewStore)setPreviewFavorite(old=>!old)}
 function backToList(){setSelected(null);setSelectedSource(null);setExpanded(true)}
 function collapseSelected(){setSelected(null);setSelectedSource(null);setExpanded(false)}
 const directionsUrl=(menu:Menu)=>menu.lat!==null&&menu.lng!==null?'https://map.kakao.com/link/to/'+encodeURIComponent(menu.shop.replace(/ · 가매장$/,''))+','+menu.lat+','+menu.lng:null;
 return <main className={previewStore?'explorer source-preview-map':'explorer'} style={{'--explorer-detail-top':`${mobileDetailTop}px`} as CSSProperties}>
  <header className="explorer-toolbar">{previewStore&&<aside className="source-preview-banner" role="note">화면 미리보기 · 공공자료 매장 · 요청·점주 신청은 저장되지 않습니다.</aside>}
   <div ref={searchRow} className="explorer-topline"><Brand/><div className="explorer-search"><Search size={21}/><Input aria-label={`${theme.name} 메뉴 검색`} value={query} onChange={e=>{setReportedMenu(null);setQuery(e.target.value)}} placeholder={theme.search}/>{query&&<Button variant="ghost" size="icon" aria-label="검색어 지우기" onClick={()=>setQuery('')}><X size={18}/></Button>}</div><span className="explorer-region"><MapPin size={16}/>{previewStore?'공공자료 매장':browseOrigin?'주변 15km':variant==='hot'?'지도에서 매장 찾기':'제보된 매장'} <small>{theme.name}</small></span>{!previewStore&&<CustomerPanel variant={variant} regularHref={`https://nowgo.space/regular/home?flavor=${variant}`} worldEntryOpen={worldEntryOpen} onWorldEntryClose={()=>setWorldEntryOpen(false)}/>}</div>
   <div className="explorer-filters" aria-label="메뉴 검색 조건">
    <label>{tasteLabel+' 단계'}<NativeSelect aria-label={tasteLabel+' 단계'} value={heat} onChange={e=>{setReportedMenu(null);setHeat(Number(e.target.value))}}><option value={0}>{'모든 '+tasteLabel}</option>{HEAT.map((h,i)=><option key={h} value={i+1}>{i+1}단계 · {h}</option>)}</NativeSelect></label>
    <label>{tasteLabel+' 카테고리'}<NativeSelect aria-label={tasteLabel+' 카테고리'} value={flavor} onChange={e=>{setReportedMenu(null);setFlavor(e.target.value)}}>{FLAVORS.map(f=><option key={f} value={f}>{f==='전체'?'모든 맛의 결':f}</option>)}</NativeSelect></label>
    <label>{categoryLabel}<NativeSelect aria-label={categoryLabel} value={category} onChange={e=>{setReportedMenu(null);setCategory(e.target.value)}}>{CATEGORIES.map(c=><option key={c} value={c}>{c==='전체'?'모든 메뉴':c}</option>)}</NativeSelect></label>
    <label className={budget?'budget-active':''}>한 끼 예산<NativeSelect aria-label="한 끼 예산" value={budget} onChange={e=>{setReportedMenu(null);setBudget(Number(e.target.value))}}><option value={0}>예산 전체</option><option value={10000}>1만 원 이하</option><option value={15000}>1만 5천 원 이하</option><option value={20000}>2만 원 이하</option></NativeSelect></label>
    <Button className="explorer-reset" variant="ghost" onClick={reset} disabled={!count&&!query&&!reportedMenu}><RotateCcw size={15}/>초기화{count>0&&<span>{count}</span>}</Button>
   </div>
  </header>
  <div className="explorer-surface">{!previewStore&&<ReporterLeaderboard variant={variant}/>}
   <KakaoMap previewSourceHeat={previewStore?localHeat:undefined} onSourceSelect={selectSource} selectedSourceId={currentSource?.id} sourcedStores={matchingSources} sourceIdentityStores={sourceStores} fullScreen sourcePreview={!!previewStore} initialCenter={(initialSourceStore||previewStore)?.coordinates?{lat:(initialSourceStore||previewStore)!.coordinates!.lat,lng:(initialSourceStore||previewStore)!.coordinates!.lon}:undefined} viewportCountQuery={previewStore?undefined:viewportCountQuery} menus={filtered} selectedId={current?.id} onSelect={select} locationControl={locationControl} onLocationState={setLocationState} onLocation={previewStore?undefined:setUserLocation} variant={variant}/>
      <aside ref={sheet} className={`explorer-results ${expanded?'expanded':'collapsed'} ${hasSelection?'has-selection':''}`} style={hasSelection?{top:0,bottom:0,maxHeight:'none'}:undefined} aria-label="검색된 메뉴">
    <div className="explorer-results-header" onTouchStart={event=>{if(hasSelection&&window.matchMedia('(max-width:700px)').matches)sheetTouch.current=event.touches[0].clientY}} onTouchMove={event=>{if(sheetTouch.current!==null)moveSheet(Math.max(0,event.touches[0].clientY-sheetTouch.current))}} onTouchEnd={()=>{if(sheetOffset.current>70)collapseSelected();sheetTouch.current=null;moveSheet(0)}} onTouchCancel={()=>{sheetTouch.current=null;moveSheet(0)}}>
    <button className="explorer-results-heading" aria-expanded={expanded} aria-controls="map-results" onClick={()=>hasSelection?collapseSelected():setExpanded(!expanded)}><span><small>{browseOrigin?'내 주변 매장 · 메뉴':sourceOnlyStores.some(store=>store.registrationState==='source-only')?'지도에 소개된 매장 · 메뉴':'등록된 매장 · 메뉴'}</small><strong>불러온 매장 <b>{combinedStores.length}</b></strong></span>{expanded?<ChevronDown size={20}/>:<ChevronUp size={20}/>}</button>
     {!previewStore&&<a className="explorer-report explorer-report--inline" href="/suggestion#report"><Plus size={16}/><span>제보 및 등록</span></a>}
    </div>
    {expanded&&<div id="map-results" ref={resultsBody} className="explorer-results-body"><p className="sourced-store-notice">핀·목록은 불러온 자료 기준 · 메뉴 요청당 최대 100개{browseOrigin?' · 내 위치 주변 15km':''}</p>{variant==='hot'&&<SourcedStoreNotice state={sourceState} retry={()=>void sourceState.refresh()}/>}{(locationBusy||locationFailed)&&<p className="explorer-example" role="status">{locationStatusText[locationState]}</p>}
        {currentSource?<SourcedStoreDetail key={currentSource.id} store={currentSource} menuId={selectedSourceMenuId} preview={!!previewStore} previewHeat={previewStore?localHeat:undefined} onPreviewHeat={previewStore?submitPreviewHeat:undefined} onPreviewHeatReset={previewStore?resetPreviewHeat:undefined} previewPhoto={previewStore&&previewHeatMenuId?previewPhotos[previewHeatMenuId]:undefined} onPreviewPhoto={previewStore?submitPreviewPhoto:undefined} onPreviewPhotoReset={previewStore?resetPreviewPhoto:undefined} previewFavorite={previewStore?previewFavorite:undefined} onPreviewFavoriteToggle={previewStore?togglePreviewFavorite:undefined} onBack={backToList}/>:current?<article className={`explorer-selected ${!current.isDemo&&!current.ownerRegistered?'reporter-store':''}`}><Button variant="ghost" className="explorer-back" onClick={backToList}>← 메뉴 목록</Button><img className="explorer-detail-photo" src={current.image} alt={`${current.name} ${current.isDemo?'참고 사진':'제보 사진'}`}/><div className="explorer-detail-content"><span className="explorer-tags">{current.flavor} · {HEAT[current.heat-1]}</span><h1>{current.name}</h1>{current.soldout&&<p className="menu-soldout-badge" role="status">현재 품절된 메뉴입니다.</p>}<DetailTastePrice variant={variant} level={current.heat} price={current.price} isDemo={current.isDemo} verifiedOwner={current.verifiedOwner}/><p>{current.description}</p>{variant==='hot'&&<p className="reported-heat-attribution">{menuHeatAttribution(current)} · {current.verifiedOwner?'점주 안내 결':'개별 제보 결'} · 다수결 미집계</p>}{current.nowgoSlug&&!current.isDemo?<a className="explorer-owner-minihome" href={`${process.env.NEXT_PUBLIC_NOWGO_SITE_URL||'https://nowgo-space-home.vercel.app'}/p/${encodeURIComponent(current.nowgoSlug)}`} target="_blank" rel="noopener noreferrer">이 매장 미니홈피 보기 ↗</a>:null}<StoreStatus variant={variant} key={current.id} menuId={current.id} isDemo={current.isDemo} ownerRegistered={current.ownerRegistered}/><OwnerJoinRequest key={current.placeId} menuId={current.id} isDemo={current.isDemo} ownerRegistered={current.ownerRegistered}/><RegularFavorite key={current.placeId} placeId={current.placeId} slug={current.nowgoSlug} isDemo={current.isDemo}/><VisitActions placeId={current.ownerStoreId?'nowgo-'+current.ownerStoreId:current.placeId} isDemo={current.isDemo}/><div className="explorer-quick-actions" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,margin:'16px 0 4px'}} aria-label="매장 이용 정보">{directionsUrl(current)?<a className="explorer-action explorer-action--primary" style={{minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,border:'1px solid #bd3828',borderRadius:8,background:'#bd3828',color:'#fff',fontSize:13,fontWeight:700,lineHeight:1.2,textDecoration:'none'}} href={directionsUrl(current)!} target="_blank" rel="noreferrer" onClick={()=>track('directions_open',current.placeId)}><Navigation size={18}/><span>길찾기</span></a>:<button type="button" className="explorer-action" style={{minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,border:'1px solid #ded8ce',borderRadius:8,background:'#fbfaf6',color:'#766f64',fontSize:13,fontWeight:700,lineHeight:1.2,cursor:locationBusy?'wait':'pointer'}} disabled={locationBusy} onClick={requestLocation}><Navigation size={18}/><span>{locationBusy?'내 위치 확인 중':userLocation?'지도 위치 재확인':'내 위치 확인'}</span></button>}<BookingActions placeId={current.placeId} isDemo={current.isDemo} variant={variant} storeName={current.shop}/></div></div></article>:
    // The HOT list shows an existing representative, never a count-derived taste aggregate.
    // Keep all reports in filtered/store.menus so direct and map selections still resolve.
    <div className="explorer-menu-list">{storeGroups.map(store=><article key={store.key} className={!store.menus[0].isDemo&&!store.ownerRegistered?'reporter-store':undefined}><header className="explorer-store-name"><strong>{store.menus[0].shop}</strong><span className="store-report-count">소비자 제보 최소 {store.reportCount}건{store.reportCount>=3?' · 제보가 많은 매장':store.reportCount>1?' · 제보 누적':''}</span></header>{sourceByKey.has(store.key)?<SourcedStoreCard store={sourceByKey.get(store.key)!} showHeading={false} preview={!!previewStore} onSelect={selectSource}/>:(variant==='hot'?store.menus.slice(0,1):store.menus).map(m=><div key={m.id}><button type="button" data-menu-id={m.id} className={`explorer-menu-item ${!m.isDemo&&!m.ownerRegistered?'reporter-store':''}`} onClick={()=>select(m)}><img src={m.image} alt={`${m.name} ${m.isDemo?'메뉴 참고 사진':'제보 사진'}`} width={84} height={84}/><span className="explorer-item-copy"><small>{m.flavor} · {HEAT[m.heat-1]}</small>{variant==='hot'&&<small className="reported-heat-attribution">{menuHeatAttribution(m)} · {m.verifiedOwner?'점주 안내 결':'개별 제보 결'} · 다수결 미집계</small>}<strong>{m.verifiedOwner?'[공식 점주] ':''}{m.name}</strong><span>{money(m.price)} <small>{m.isDemo?'예시':m.verifiedOwner?'공식 점주':'제보'}</small></span>{!m.isDemo&&!m.ownerRegistered?<small className="reporter-store-status">제보자 등록매장 · 점주 영업현황 미등록</small>:null}</span><ArrowUpRight size={17}/></button></div>)}<OwnerJoinRequest key={store.placeId} compact menuId={store.menus[0].id} isDemo={store.menus[0].isDemo} ownerRegistered={store.ownerRegistered}/>{!store.menus[0].isDemo&&<RegularFavorite compact placeId={store.placeId} slug={store.menus[0].nowgoSlug} isDemo={false}/>}</article>)}{sourceOnlyStores.map(store=><article key={store.id}><SourcedStoreCard store={store} preview={!!previewStore} previewPhoto={previewStore&&previewHeatMenuId?previewPhotos[previewHeatMenuId]:undefined} previewPhotoMenuId={previewStore?previewHeatMenuId:undefined} onSelect={selectSource}/></article>)}{!combinedStores.length&&<div className="explorer-empty"><MapPin size={27}/><h2>조건에 맞는 메뉴가 없어요</h2><p>검색어나 필터를 바꿔 주세요.</p>{!previewStore&&variant==='hot'&&<p><a href="/naver-search">NAVER 검색 참고자료 보기 ↗</a></p>}<Button variant="outline" onClick={reset}>조건 초기화</Button></div>}</div>}{hasMore&&<Button variant="outline" onClick={()=>void load(page+1)}>메뉴 더 보기</Button>}
   </div>}
   </aside>
   {!previewStore&&<a className="explorer-report explorer-report--floating" href="/suggestion#report"><Plus size={22}/><span>제보 및 등록</span><ArrowUpRight size={19}/></a>}
   {!previewStore&&<MapChat variant={variant}/>}
  </div>
  {!previewStore&&!worldEntryOpen&&<FirstLoginTour taste={variant} page="map"/>}
 </main>
}


