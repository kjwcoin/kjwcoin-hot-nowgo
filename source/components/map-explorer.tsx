'use client';
import StoreStatus from '@/components/store-status';
import Brand from '@/components/brand';
import {useEffect,useMemo,useState} from 'react';
import {Search,X,MapPin,Plus,ArrowUpRight,ChevronDown,ChevronUp,RotateCcw,Clock} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {NativeSelect} from '@/components/ui/native-select';
import ReviewLink from '@/components/review-link';
import CustomerPanel from './customer-panel';
import KakaoMap from './kakao-map';
import {MENUS,HEAT,FLAVORS,money,type Menu} from '@/lib/menus';
import {api,track} from '@/lib/client';
const CATEGORIES=['전체','카페','베이커리','케이크','도넛·쿠키','아이스크림·빙수','초콜릿·캔디','전통 디저트','기타'];
type Point={lat:number;lng:number};
const km=(a:Point,b:Point)=>{const r=6371,toRad=(v:number)=>v*Math.PI/180,dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;return 2*r*Math.asin(Math.sqrt(x))};
export default function MapExplorer(){
 useEffect(()=>{if(['#report','#owner','#photo-credits','#discover'].includes(location.hash))location.replace('/suggestion'+location.hash)},[]);
 const [catalog,setCatalog]=useState<Menu[]>(MENUS),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [query,setQuery]=useState(''),[heat,setHeat]=useState(0),[flavor,setFlavor]=useState('전체'),[category,setCategory]=useState('전체'),[budget,setBudget]=useState(0),[selected,setSelected]=useState<Menu|null>(null),[expanded,setExpanded]=useState(true),[location,setLocation]=useState<Point|null>(null);
 const parameters=(nextPage:number)=>{const p=new URLSearchParams({page:String(nextPage)});if(query)p.set('q',query);if(heat)p.set('heat',String(heat));if(flavor!=='전체')p.set('flavor',flavor);if(category!=='전체')p.set('category',category);if(budget)p.set('budget',String(budget));if(location){p.set('lat',String(location.lat));p.set('lng',String(location.lng));p.set('radiusKm','30')}return p};
 const demos=useMemo(()=>location?MENUS.filter(m=>m.lat!==null&&m.lng!==null&&km(location,{lat:m.lat,lng:m.lng})<=30):MENUS,[location]);
 const load=(nextPage:number)=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${parameters(nextPage)}`).then(d=>{setCatalog(old=>nextPage?[...old,...d.menus]:[...demos,...d.menus]);setPage(nextPage);setHasMore(d.hasMore)});
 useEffect(()=>{let cancelled=false;const p=parameters(0);const refresh=()=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${p}`).then(d=>{if(!cancelled){setCatalog([...demos,...d.menus]);setPage(0);setHasMore(d.hasMore)}}).catch(()=>{});const timer=setTimeout(refresh,query?250:0);window.addEventListener('focus',refresh);return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('focus',refresh)}},[query,heat,flavor,category,budget,location,demos]);
 const filtered=useMemo(()=>catalog.filter(m=>(!heat||m.heat===heat)&&(flavor==='전체'||m.flavor===flavor)&&(category==='전체'||m.category===category)&&(!budget||m.price<=budget)&&`${m.name} ${m.shop} ${m.category} ${m.area}`.replace(/\s/g,'').includes(query.trim().replace(/\s/g,''))),[catalog,query,heat,flavor,category,budget]);
 const current=selected&&filtered.some(m=>m.id===selected.id)?selected:null;
 const count=Number(!!heat)+Number(flavor!=='전체')+Number(category!=='전체')+Number(!!budget);
 function reset(){setQuery('');setHeat(0);setFlavor('전체');setCategory('전체');setBudget(0);setSelected(null)}
 function select(m:Menu){setSelected(m);setExpanded(true);track('menu_detail_open',m.id)}
 return <main className="explorer">
  <header className="explorer-toolbar">
   <div className="explorer-topline"><Brand/><div className="explorer-search"><Search size={21}/><Input aria-label="카페·디저트 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="케이크, 크루아상, 젤라또"/>{query&&<Button variant="ghost" size="icon" aria-label="검색어 지우기" onClick={()=>setQuery('')}><X size={18}/></Button>}</div><span className="explorer-region"><MapPin size={16}/>대한민국 전국 <small>SWEET</small><a className="explorer-promo" href="/suggestion">SWEET 소개 ↗</a></span><CustomerPanel/></div>
   <div className="explorer-filters" aria-label="메뉴 검색 조건">
    <label>스윗한 단계<NativeSelect aria-label="스윗한 단계" value={heat} onChange={e=>setHeat(Number(e.target.value))}><option value={0}>모든 달콤함</option>{HEAT.map((h,i)=><option key={h} value={i+1}>{i+1}단계 · {h}</option>)}</NativeSelect></label>
    <label>스윗한 맛<NativeSelect aria-label="스윗한 맛" value={flavor} onChange={e=>setFlavor(e.target.value)}>{FLAVORS.map(f=><option key={f} value={f}>{f==='전체'?'모든 맛의 결':f}</option>)}</NativeSelect></label>
    <label>디저트 메뉴<NativeSelect aria-label="디저트 메뉴" value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(c=><option key={c} value={c}>{c==='전체'?'모든 메뉴':c}</option>)}</NativeSelect></label>
    <label className={budget?'budget-active':''}>한 끼 예산<NativeSelect aria-label="한 끼 예산" value={budget} onChange={e=>setBudget(Number(e.target.value))}><option value={0}>예산 전체</option><option value={10000}>1만 원 이하</option><option value={15000}>1만 5천 원 이하</option><option value={20000}>2만 원 이하</option></NativeSelect></label>
    <Button className="explorer-reset" variant="ghost" onClick={reset} disabled={!count&&!query}><RotateCcw size={15}/>초기화{count>0&&<span>{count}</span>}</Button>
   </div>
  </header>
  <div className="explorer-surface">
   <KakaoMap fullScreen menus={filtered} selectedId={current?.id} onSelect={select} onLocation={setLocation}/>
   <aside className={`explorer-results ${expanded?'expanded':'collapsed'}`} aria-label="검색된 메뉴">
    <button className="explorer-results-heading" aria-expanded={expanded} aria-controls="map-results" onClick={()=>setExpanded(!expanded)}><span><small>{location?'내 위치 반경 30km':'전국의 카페·디저트'}</small><strong>지금 당기는 디저트 <b>{filtered.length}</b></strong></span>{expanded?<ChevronDown size={20}/>:<ChevronUp size={20}/>}</button>
    {expanded&&<div id="map-results" className="explorer-results-body"><p className="explorer-example">가매장 3곳은 개발용 · 실제 영업하지 않아요</p>
    {current?<article className="explorer-selected"><Button variant="ghost" className="explorer-back" onClick={()=>setSelected(null)}>← 메뉴 목록</Button><img className="explorer-detail-photo" src={current.image} alt={`${current.name} ${current.isDemo?'참고 사진':'제보 사진'}`}/><div className="explorer-detail-content"><span className="explorer-tags">{current.flavor} · {HEAT[current.heat-1]}</span><h1>{current.name}</h1><strong className="explorer-price">{money(current.price)} <small>{current.isDemo?'예시':current.verifiedOwner?'공식 점주 제보 가격':'고객 제보 가격'}</small></strong><p>{current.description}</p><StoreStatus menuId={current.id} isDemo={current.isDemo}/><a className="explorer-go" href={`/go/${current.placeId}`} onClick={()=>track('place_status_open',current.placeId)}>출발 전 가게 확인 <ArrowUpRight size={19}/></a><ReviewLink placeId={current.placeId} isDemo={current.isDemo}/><small>{current.isDemo?'실제로 영업하지 않는 개발용 가매장입니다. 현실에 없는 매장입니다.':`${current.verifiedOwner?'공식 점주 제보':'고객 제보 · 점주 미확인'} · 확인일 ${current.reportedAt||'미상'}`}</small><div className="explorer-owner-join"><strong>이 메뉴를 만드는 사장님이라면</strong><p>통합회원은 SWEET에서 사진·가격·연락처와 함께 제보할 수 있어요. 공식 점주는 NOWGO에서 매장 권한을 확인한 같은 계정으로 제보합니다.</p><a href="https://www.nowgo.space/owner/login" target="_blank" rel="noreferrer">나우고 점주 가입하기 <ArrowUpRight size={18}/></a><small>{current.isDemo?'나우고 스페이스로 이동 · 가매장은 소유권 신청 대상이 아닙니다.':'나우고 스페이스에서 Free 가입 및 매장 관리 권한 확인'}</small></div></div></article>:
    <div className="explorer-menu-list">{filtered.map(m=><button className="explorer-menu-item" key={m.id} onClick={()=>select(m)}><img src={m.image} alt={`${m.name} ${m.isDemo?'가매장 참고 사진':'제보 사진'}`} width={84} height={84}/><span className="explorer-item-copy"><small>{m.flavor} · {HEAT[m.heat-1]}</small><strong>{m.isDemo?'[가매장] ':m.verifiedOwner?'[공식 점주] ':''}{m.name}</strong><span>{money(m.price)} <small>{m.isDemo?'예시':m.verifiedOwner?'공식 점주':'제보'}</small></span></span><ArrowUpRight size={17}/></button>)}{!filtered.length&&<div className="explorer-empty"><Search size={27}/><h2>아직 이 한 접시가 없어요.</h2><p>조건을 바꾸거나<br/>알고 있는 메뉴를 알려주세요.</p><Button variant="outline" onClick={reset}>조건 초기화</Button></div>}</div>}{hasMore&&<Button variant="outline" onClick={()=>void load(page+1)}>메뉴 더 보기</Button>}
    <a className="explorer-photo-credit" href="/suggestion#photo-credits">참고 사진 출처 및 시안 안내</a></div>}
   </aside>
   <a className="explorer-report" href="/suggestion#report"><Plus size={22}/><span>제보 및 등록</span><ArrowUpRight size={19}/></a>
  </div>
 </main>
}
