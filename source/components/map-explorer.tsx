'use client';
import StoreStatus from '@/components/store-status';
import BookingActions from '@/components/booking-actions';
import Brand from '@/components/brand';
import {useEffect,useMemo,useState} from 'react';import {Search,X,MapPin,Plus,ArrowUpRight,ChevronDown,ChevronUp,RotateCcw,Navigation} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {NativeSelect} from '@/components/ui/native-select';
import ReviewLink from '@/components/review-link';
import CustomerPanel from './customer-panel';
import VisitActions from './activity/visit-actions';
import KakaoMap from './kakao-map';
import FirstLoginTour from './first-login-tour';
import type {DemoLocationState} from '@/lib/resolve-demo-land';
import {MAP_RADIUS_KM,menusWithinRadius,type GeoPoint} from '@/lib/nearby-demo';
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
export default function MapExplorer({variant='hot'}:{variant?:SiteVariant}){
 const theme=siteConfig(variant),MENUS=theme.menus,HEAT=theme.heat,FLAVORS=theme.flavors,CATEGORIES=['전체',...theme.categories],tasteLabel=variant==='hot'?'매운맛':variant==='rich'?'느끼함':'달콤함',categoryLabel=variant==='hot'?'매운맛 메뉴':variant==='rich'?'느끼한 메뉴':'달콤한 디저트';
 useEffect(()=>{if(['#report','#owner','#photo-credits','#discover'].includes(location.hash))location.replace('/suggestion'+location.hash)},[]);
 useEffect(()=>{if(window.matchMedia('(max-width:700px)').matches)setExpanded(false)},[]);
 const [worldEntryOpen,setWorldEntryOpen]=useState(true);
 const [catalog,setCatalog]=useState<Menu[]>(MENUS),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [query,setQuery]=useState(''),[heat,setHeat]=useState(0),[flavor,setFlavor]=useState('전체'),[category,setCategory]=useState('전체'),[budget,setBudget]=useState(0),[selected,setSelected]=useState<Menu|null>(null),[expanded,setExpanded]=useState(true),[userLocation,setUserLocation]=useState<GeoPoint|null>(null),[demoLocations,setDemoLocations]=useState<{origin:GeoPoint;points:GeoPoint[];state:DemoLocationState}|null>(null);
 const parameters=(nextPage:number)=>{const p=new URLSearchParams({page:String(nextPage)});if(query)p.set('q',query);if(heat)p.set('heat',String(heat));if(flavor!=='전체')p.set('flavor',flavor);if(category!=='전체')p.set('category',category);if(budget)p.set('budget',String(budget));if(userLocation){p.set('lat',String(userLocation.lat));p.set('lng',String(userLocation.lng));p.set('radiusKm',String(MAP_RADIUS_KM))}return p};
 const load=(nextPage:number)=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${parameters(nextPage)}`).then(d=>{setCatalog(old=>nextPage?[...old,...d.menus]:[...MENUS,...d.menus]);setPage(nextPage);setHasMore(d.hasMore)});
 useEffect(()=>{let cancelled=false;const p=parameters(0);const refresh=()=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${p}`).then(d=>{if(!cancelled){setCatalog([...MENUS,...d.menus]);setPage(0);setHasMore(d.hasMore)}}).catch(()=>{});const timer=setTimeout(refresh,query?250:0);window.addEventListener('focus',refresh);return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('focus',refresh)}},[query,heat,flavor,category,budget,userLocation]);
 const locatedCatalog=useMemo(()=>menusWithinRadius(catalog,userLocation,MAP_RADIUS_KM,demoLocations&&demoLocations.origin.lat===userLocation?.lat&&demoLocations.origin.lng===userLocation?.lng?demoLocations.points:[]),[catalog,userLocation,demoLocations]);
 const filtered=useMemo(()=>locatedCatalog.filter(m=>(!heat||m.heat===heat)&&(flavor==='전체'||m.flavor===flavor)&&(category==='전체'||m.category===category)&&(!budget||m.price<=budget)&&`${m.name} ${m.shop} ${m.category} ${m.area}`.replace(/\s/g,'').includes(query.trim().replace(/\s/g,''))),[locatedCatalog,query,heat,flavor,category,budget]);
 const current=selected?filtered.find(m=>m.id===selected.id)||null:null;
 const nearbyPending=Boolean(userLocation&&(!demoLocations||demoLocations.origin.lat!==userLocation.lat||demoLocations.origin.lng!==userLocation.lng||demoLocations.state==='loading'));
 const nearbyFailed=Boolean(!nearbyPending&&demoLocations?.state==='error');
 const nearbyEmpty=Boolean(!nearbyPending&&demoLocations?.state==='empty');
 const count=Number(!!heat)+Number(flavor!=='전체')+Number(category!=='전체')+Number(!!budget);
 function reset(){setQuery('');setHeat(0);setFlavor('전체');setCategory('전체');setBudget(0);setSelected(null)}
 useEffect(()=>{track('map_open','map')},[]);
 function select(m:Menu){setSelected(m);setExpanded(true);track('menu_detail_open',m.id)}
 function collapseSelected(){setSelected(null);setExpanded(false)}
 const directionsUrl=(menu:Menu)=>menu.lat!==null&&menu.lng!==null?'https://map.kakao.com/link/to/'+encodeURIComponent(menu.shop.replace(/ · 가매장$/,''))+','+menu.lat+','+menu.lng:null;
 return <main className="explorer">
  <header className="explorer-toolbar">
   <div className="explorer-topline"><Brand/><div className="explorer-search"><Search size={21}/><Input aria-label={`${theme.name} 메뉴 검색`} value={query} onChange={e=>setQuery(e.target.value)} placeholder={theme.search}/>{query&&<Button variant="ghost" size="icon" aria-label="검색어 지우기" onClick={()=>setQuery('')}><X size={18}/></Button>}</div><span className="explorer-region"><MapPin size={16}/>주변 15km <small>{theme.name}</small><a className="explorer-promo" href="/suggestion">{theme.name} 소개 ↗</a></span><CustomerPanel variant={variant} worldEntryOpen={worldEntryOpen} onWorldEntryClose={()=>setWorldEntryOpen(false)}/></div>
   <div className="explorer-filters" aria-label="메뉴 검색 조건">
    <label>{tasteLabel+' 단계'}<NativeSelect aria-label={tasteLabel+' 단계'} value={heat} onChange={e=>setHeat(Number(e.target.value))}><option value={0}>{'모든 '+tasteLabel}</option>{HEAT.map((h,i)=><option key={h} value={i+1}>{i+1}단계 · {h}</option>)}</NativeSelect></label>
    <label>{tasteLabel+' 카테고리'}<NativeSelect aria-label={tasteLabel+' 카테고리'} value={flavor} onChange={e=>setFlavor(e.target.value)}>{FLAVORS.map(f=><option key={f} value={f}>{f==='전체'?'모든 맛의 결':f}</option>)}</NativeSelect></label>
    <label>{categoryLabel}<NativeSelect aria-label={categoryLabel} value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(c=><option key={c} value={c}>{c==='전체'?'모든 메뉴':c}</option>)}</NativeSelect></label>
    <label className={budget?'budget-active':''}>한 끼 예산<NativeSelect aria-label="한 끼 예산" value={budget} onChange={e=>setBudget(Number(e.target.value))}><option value={0}>예산 전체</option><option value={10000}>1만 원 이하</option><option value={15000}>1만 5천 원 이하</option><option value={20000}>2만 원 이하</option></NativeSelect></label>
    <Button className="explorer-reset" variant="ghost" onClick={reset} disabled={!count&&!query}><RotateCcw size={15}/>초기화{count>0&&<span>{count}</span>}</Button>
   </div>
  </header>
  <div className="explorer-surface">
   <KakaoMap fullScreen menus={filtered} selectedId={current?.id} onSelect={select} onLocation={point=>{setSelected(null);setUserLocation(point)}} onDemoPositions={(origin,points,state)=>setDemoLocations(previous=>({origin,points:(state==='loading'||state==='error'&&!points.length)&&previous?.origin.lat===origin.lat&&previous?.origin.lng===origin.lng?previous.points:points,state}))} variant={variant}/>
      <aside className={`explorer-results ${expanded?'expanded':'collapsed'} ${current?'has-selection':''}`} style={current?{top:0,bottom:0,maxHeight:'none'}:undefined} aria-label="검색된 메뉴">
    <div className="explorer-results-header">
    <button className="explorer-results-heading" aria-expanded={expanded} aria-controls="map-results" onClick={()=>current?collapseSelected():setExpanded(!expanded)}><span><small>{nearbyPending?'가매장 위치 확인 중':userLocation?'지정한 위치 기준 15km':'내 위치 버튼으로 주변 메뉴 찾기'}</small><strong>지금 당기는 한 접시 <b>{filtered.length}</b></strong></span>{expanded?<ChevronDown size={20}/>:<ChevronUp size={20}/>}</button>
     <a className="explorer-report explorer-report--inline" href="/suggestion#report"><Plus size={16}/><span>제보 및 등록</span></a>
    </div>
    {expanded&&<div id="map-results" className="explorer-results-body"><p className="explorer-example" role="status">{nearbyFailed?'가매장 위치 조회가 지연됐어요. 지도에서 내 위치를 눌러 다시 확인해 주세요.':nearbyEmpty?'주변에서 가매장을 표시할 육지 주소를 확인하지 못했어요.':userLocation?'예시 가매장은 주소가 확인된 위치에만 표시 · 실제 영업하지 않아요':'내 위치 버튼을 누르고 위치 권한을 허용하면 15km 안의 메뉴가 표시돼요'}</p>
        {current?<article className="explorer-selected"><Button variant="ghost" className="explorer-back" onClick={()=>setSelected(null)}>← 메뉴 목록</Button><img className="explorer-detail-photo" src={current.image} alt={`${current.name} ${current.isDemo?'참고 사진':'제보 사진'}`}/><div className="explorer-detail-content"><span className="explorer-tags">{current.flavor} · {HEAT[current.heat-1]}</span><h1>{current.name}</h1><DetailTastePrice variant={variant} level={current.heat} price={current.price} isDemo={current.isDemo} verifiedOwner={current.verifiedOwner}/><p>{current.description}</p>{current.nowgoSlug&&!current.isDemo?<a className="explorer-owner-minihome" href={`${process.env.NEXT_PUBLIC_NOWGO_SITE_URL||'https://nowgo-space-home.vercel.app'}/p/${encodeURIComponent(current.nowgoSlug)}`} target="_blank" rel="noopener noreferrer">이 매장 미니홈피 보기 ↗</a>:null}<StoreStatus menuId={current.id} isDemo={current.isDemo}/><VisitActions placeId={current.placeId} isDemo={current.isDemo}/><div className="explorer-quick-actions" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,margin:'16px 0 4px'}} aria-label="매장 이용 정보">{directionsUrl(current)?<a className="explorer-action explorer-action--primary" style={{minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,border:'1px solid #bd3828',borderRadius:8,background:'#bd3828',color:'#fff',fontSize:13,fontWeight:700,lineHeight:1.2,textDecoration:'none'}} href={directionsUrl(current)!} target="_blank" rel="noreferrer" onClick={()=>track('directions_open',current.placeId)}><Navigation size={18}/><span>길찾기</span></a>:<span className="explorer-action" style={{minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,border:'1px solid #ded8ce',borderRadius:8,background:'#fbfaf6',color:'#766f64',fontSize:13,fontWeight:700,lineHeight:1.2}} aria-disabled="true"><Navigation size={18}/><span>위치 확인 중</span></span>}<BookingActions placeId={current.placeId} isDemo={current.isDemo} variant={variant} storeName={current.shop}/></div><small>{current.isDemo?'실제로 영업하지 않는 개발용 가매장입니다.':''}</small></div></article>:
    <div className="explorer-menu-list">{filtered.map(m=><button className="explorer-menu-item" key={m.id} onClick={()=>select(m)}><img src={m.image} alt={`${m.name} ${m.isDemo?'가매장 참고 사진':'제보 사진'}`} width={84} height={84}/><span className="explorer-item-copy"><small>{m.flavor} · {HEAT[m.heat-1]}</small><strong>{m.isDemo?'[가매장] ':m.verifiedOwner?'[공식 점주] ':''}{m.name}</strong><span>{money(m.price)} <small>{m.isDemo?'예시':m.verifiedOwner?'공식 점주':'제보'}</small></span></span><ArrowUpRight size={17}/></button>)}{!filtered.length&&<div className="explorer-empty"><MapPin size={27}/><h2>{nearbyPending?'가매장 위치 확인 중':nearbyFailed?'가매장 위치를 불러오지 못했어요':nearbyEmpty?'가매장 위치를 확인하지 못했어요':userLocation?'15km 안에 표시할 메뉴가 없어요':'내 위치를 눌러 주세요'}</h2><p>{nearbyPending?'주변 육지 주소를 확인하고 있어요.':nearbyFailed||nearbyEmpty?'지도에서 내 위치를 눌러 다시 확인해 주세요.':userLocation?'조건을 바꾸거나 알고 있는 메뉴를 알려주세요.':'지도에서 내 위치 버튼을 누르고 위치 권한을 허용해 주세요.'}</p>{userLocation&&<Button variant="outline" onClick={reset}>조건 초기화</Button>}</div>}</div>}{hasMore&&<Button variant="outline" onClick={()=>void load(page+1)}>메뉴 더 보기</Button>}
    <a className="explorer-photo-credit" href="/suggestion#photo-credits">참고 사진 출처 및 시안 안내</a></div>}
   </aside>
   <a className="explorer-report explorer-report--floating" href="/suggestion#report"><Plus size={22}/><span>제보 및 등록</span><ArrowUpRight size={19}/></a>
  </div>
  {!worldEntryOpen&&<FirstLoginTour taste={variant} page="map"/>}
 </main>
}

