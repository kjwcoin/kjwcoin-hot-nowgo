'use client';
import StoreStatus from '@/components/store-status';
import Brand from '@/components/brand';
import {useEffect,useMemo,useState} from 'react';
import {Search,X,MapPin,Plus,ArrowUpRight,ChevronDown,ChevronUp,RotateCcw,Star,Navigation,CalendarClock,UsersRound} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {NativeSelect} from '@/components/ui/native-select';
import ReviewLink from '@/components/review-link';
import CustomerPanel from './customer-panel';
import KakaoMap from './kakao-map';
import FirstLoginTour from './first-login-tour';
import {MAP_RADIUS_KM,menusWithinRadius,type GeoPoint} from '@/lib/nearby-demo';
import {MENUS,HEAT,FLAVORS,money,type Menu} from '@/lib/menus';
import {api,track} from '@/lib/client';
const CATEGORIES=['전체','카페','베이커리','케이크','도넛·쿠키','아이스크림·빙수','초콜릿·캔디','전통 리치 메뉴','기타'];
export default function MapExplorer(){
 useEffect(()=>{if(['#report','#owner','#photo-credits','#discover'].includes(window.location.hash))window.location.replace('/suggestion'+window.location.hash)},[]);
 useEffect(()=>{if(window.matchMedia('(max-width:700px)').matches)setExpanded(false)},[]);
 const [catalog,setCatalog]=useState<Menu[]>(MENUS),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [query,setQuery]=useState(''),[heat,setHeat]=useState(0),[flavor,setFlavor]=useState('전체'),[category,setCategory]=useState('전체'),[budget,setBudget]=useState(0),[selected,setSelected]=useState<Menu|null>(null),[expanded,setExpanded]=useState(true),[userLocation,setUserLocation]=useState<GeoPoint|null>(null),[demoLocations,setDemoLocations]=useState<{origin:GeoPoint;points:GeoPoint[]}|null>(null);
 const parameters=(nextPage:number)=>{const p=new URLSearchParams({page:String(nextPage)});if(query)p.set('q',query);if(heat)p.set('heat',String(heat));if(flavor!=='전체')p.set('flavor',flavor);if(category!=='전체')p.set('category',category);if(budget)p.set('budget',String(budget));if(userLocation){p.set('lat',String(userLocation.lat));p.set('lng',String(userLocation.lng));p.set('radiusKm',String(MAP_RADIUS_KM))}return p};
 const load=(nextPage:number)=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${parameters(nextPage)}`).then(d=>{setCatalog(old=>nextPage?[...old,...d.menus]:[...MENUS,...d.menus]);setPage(nextPage);setHasMore(d.hasMore)});
 useEffect(()=>{let cancelled=false;const p=parameters(0);const refresh=()=>api<{menus:Menu[];hasMore:boolean}>(`/api/menus?${p}`).then(d=>{if(!cancelled){setCatalog([...MENUS,...d.menus]);setPage(0);setHasMore(d.hasMore)}}).catch(()=>{});const timer=setTimeout(refresh,query?250:0);window.addEventListener('focus',refresh);return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('focus',refresh)}},[query,heat,flavor,category,budget,userLocation]);
 const located=useMemo(()=>menusWithinRadius(catalog,userLocation,demoLocations&&demoLocations.origin.lat===userLocation?.lat&&demoLocations.origin.lng===userLocation?.lng?demoLocations.points:[]),[catalog,userLocation,demoLocations]);
 const filtered=useMemo(()=>located.filter(m=>(!heat||m.heat===heat)&&(flavor==='전체'||m.flavor===flavor)&&(category==='전체'||m.category===category)&&(!budget||m.price<=budget)&&`${m.name} ${m.shop} ${m.category} ${m.area}`.replace(/\s/g,'').includes(query.trim().replace(/\s/g,''))),[located,query,heat,flavor,category,budget]);
 const current=selected&&filtered.some(m=>m.id===selected.id)?selected:null;
 const nearbyPending=Boolean(userLocation&&(!demoLocations||demoLocations.origin.lat!==userLocation.lat||demoLocations.origin.lng!==userLocation.lng));
 const count=Number(!!heat)+Number(flavor!=='전체')+Number(category!=='전체')+Number(!!budget);
 function reset(){setQuery('');setHeat(0);setFlavor('전체');setCategory('전체');setBudget(0);setSelected(null)}
  function select(m:Menu){setSelected(m);setExpanded(true);track('menu_detail_open',m.id)}
 function collapseSelected(){setSelected(null);setExpanded(false)}
 const directionsUrl=(menu:Menu)=>menu.lat!==null&&menu.lng!==null?'https://map.kakao.com/link/to/'+encodeURIComponent(menu.shop.replace(/ · 가매장$/,''))+','+menu.lat+','+menu.lng:null;
 return <main className="explorer">
  <header className="explorer-toolbar">
   <div className="explorer-topline"><Brand/><div className="explorer-search"><Search size={21}/><Input aria-label="느끼한 맛 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="크림 파스타, 치즈 그라탱, 버터 소금빵"/>{query&&<Button variant="ghost" size="icon" aria-label="검색어 지우기" onClick={()=>setQuery('')}><X size={18}/></Button>}</div><span className="explorer-region"><MapPin size={16}/>대한민국 전국 <small>RICH</small><a className="explorer-promo" href="/suggestion">RICH 소개 ↗</a></span><CustomerPanel/></div>
   <div className="explorer-filters" aria-label="메뉴 검색 조건">
