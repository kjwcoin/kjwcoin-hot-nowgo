'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CalendarClock,UsersRound,X} from 'lucide-react';
import styles from './booking-actions.module.css';
import {activityAction} from '@/lib/activity/client';
import {browserDb} from '@/lib/supabase-browser';
import type {SiteVariant} from '@/lib/site-config';
import DemoBooking from './demo-booking';
type Snapshot={placeId?:string;linked:boolean;slug?:string;waitingCount?:number;reservationsEnabled?:boolean;waitingEnabled?:boolean};
type Kind='reservation'|'waiting';
const base={minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,borderRadius:8,fontSize:13,fontWeight:700,lineHeight:1.2,textDecoration:'none',textAlign:'center'} as const;
export default function BookingActions({placeId,isDemo,variant='hot',storeName='체험 매장'}:{placeId:string;isDemo:boolean;variant?:SiteVariant;storeName?:string}){
 const [state,setState]=useState<Snapshot|null>(null);
 const [kind,setKind]=useState<Kind|null>(null);
 const [loaded,setLoaded]=useState(false);
 const [context,setContext]=useState('');
 const [pending,setPending]=useState(false);
 const [bookingError,setBookingError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(isDemo)return;let live=true;const refresh=()=>fetch(`/api/booking-state/${encodeURIComponent(placeId)}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(live)setState({...d,placeId})}).catch(()=>{if(live)setState(null)});void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},15000);window.addEventListener('focus',refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener('focus',refresh)}},[placeId,isDemo]);
 useEffect(()=>{if(!kind||!dialog.current)return;const node=dialog.current;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;node.showModal();document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=overflow;previous?.focus()}},[kind]);
 const slug=state?.placeId===placeId&&state.linked&&state.slug?state.slug:null;
 const root=slug?`https://nowgo.space/p/${encodeURIComponent(slug)}/book`:null;
 const closed={...base,border:'1px solid #ded8ce',background:'#f5f2eb',color:'#625b50'};
 async function open(value:Kind){if(isDemo){setKind(value);return}if(pending||!slug)return;setPending(true);setBookingError('');try{const {data}=await browserDb().auth.getSession();const result=data.session?await activityAction<{id:string}>('context',{slug}):null;setContext(result?.id||'');setLoaded(false);setKind(value)}catch(e){setBookingError((e as Error).message)}finally{setPending(false)}}
 return <>
  {root||isDemo?<button type="button" disabled={pending} aria-haspopup="dialog" className="explorer-action" style={{...base,border:'1px solid var(--brand-ink,#bd3828)',background:'#fff',color:'var(--brand-ink,#842719)',cursor:'pointer'}} onClick={()=>void open('reservation')}><CalendarClock size={18}/><span>예약하기</span><small>{isDemo?'날짜·시간 선택 · 체험':state?.reservationsEnabled?'날짜·시간 선택':'예약 달력 보기'}</small></button>:<span className="explorer-action" style={closed} aria-disabled="true"><CalendarClock size={18}/><span>예약하기</span><small>매장 연결 전</small></span>}
  {root||isDemo?<button type="button" disabled={pending} aria-haspopup="dialog" className="explorer-action" style={{...base,border:'1px solid var(--brand-ink,#bd3828)',background:'#fff',color:'var(--brand-ink,#842719)',cursor:'pointer'}} onClick={()=>void open('waiting')}><UsersRound size={18}/><span>웨이팅수 보기</span><small>{isDemo?'3팀 · 접수 체험':`${state?.waitingCount??0}팀 · ${state?.waitingEnabled?'접수·내 순번':'대기 현황'}`}</small></button>:<span className="explorer-action" style={closed} aria-disabled="true"><UsersRound size={18}/><span>웨이팅수 보기</span><small>매장 연결 전</small></span>}
  {kind&&(root||isDemo)?createPortal(<dialog ref={dialog} className={styles.dialog} data-variant={variant} aria-label="매장 예약·웨이팅" onCancel={event=>{event.preventDefault();setKind(null)}}><header><strong>{variant.toUpperCase()} · {kind==='reservation'?'예약하기':'웨이팅 접수·내 순번'}</strong><button onClick={()=>setKind(null)} aria-label="예약·웨이팅 팝업 닫기"><X size={20}/></button></header>{isDemo?<DemoBooking key={placeId+'-'+kind} kind={kind} placeId={placeId} storeName={storeName} variant={variant} onClose={()=>setKind(null)}/>:<>{!loaded?<p role="status" className={styles.loading}>매장 예약 정보를 불러오고 있어요…</p>:null}<iframe key={`${slug}-${kind}`} title="NOWGO 매장 예약·웨이팅 접수" src={`${root}?kind=${kind}&embed=1&theme=${variant}${context?`&activityContext=${encodeURIComponent(context)}`:''}`} onLoad={()=>setLoaded(true)} referrerPolicy="strict-origin-when-cross-origin" /></>}</dialog>,document.body):null}
 {bookingError&&<p role="alert" style={{gridColumn:"1/-1",fontSize:13}}>{bookingError}</p>}
 </>;
}
