'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CalendarClock,UsersRound,X} from 'lucide-react';
import styles from './booking-actions.module.css';
type Snapshot={linked:boolean;slug?:string;waitingCount?:number;reservationsEnabled?:boolean;waitingEnabled?:boolean};
type Kind='reservation'|'waiting';
const base={minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,borderRadius:8,fontSize:13,fontWeight:700,lineHeight:1.2,textDecoration:'none',textAlign:'center'} as const;
export default function BookingActions({placeId,isDemo}:{placeId:string;isDemo:boolean}){
 const [state,setState]=useState<Snapshot|null>(null);
 const [kind,setKind]=useState<Kind|null>(null);
 const [loaded,setLoaded]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(isDemo)return;let live=true;const refresh=()=>fetch(`/api/booking-state/${encodeURIComponent(placeId)}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(live)setState(d)}).catch(()=>{if(live)setState(null)});void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},15000);window.addEventListener('focus',refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener('focus',refresh)}},[placeId,isDemo]);
 useEffect(()=>{if(!kind||!dialog.current)return;const node=dialog.current;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;node.showModal();document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=overflow;previous?.focus()}},[kind]);
 const slug=state?.linked&&state.slug?state.slug:null;
 const root=slug?`https://nowgo.space/p/${encodeURIComponent(slug)}/book`:null;
 const closed={...base,border:'1px solid #ded8ce',background:'#f5f2eb',color:'#625b50'};
 const open=(value:Kind)=>{setLoaded(false);setKind(value)};
 return <>
  {root?<button type="button" aria-haspopup="dialog" className="explorer-action" style={{...base,border:'1px solid var(--accent,#bd3828)',background:'#fff',color:'var(--ink,#842719)',cursor:'pointer'}} onClick={()=>open('reservation')}><CalendarClock size={18}/><span>예약하기</span><small>{state?.reservationsEnabled?'날짜·시간 선택':'예약 달력 보기'}</small></button>:<span className="explorer-action" style={closed} aria-disabled="true"><CalendarClock size={18}/><span>예약하기</span><small>{isDemo?'가매장':'매장 연결 전'}</small></span>}
  {root?<button type="button" aria-haspopup="dialog" className="explorer-action" style={{...base,border:'1px solid var(--accent,#bd3828)',background:'#fff',color:'var(--ink,#842719)',cursor:'pointer'}} onClick={()=>open('waiting')}><UsersRound size={18}/><span>웨이팅 {state?.waitingCount??0}팀</span><small>{state?.waitingEnabled?'접수·내 순번':'대기 현황 보기'}</small></button>:<span className="explorer-action" style={closed} aria-disabled="true"><UsersRound size={18}/><span>웨이팅수 보기</span><small>{isDemo?'가매장':'매장 연결 전'}</small></span>}
  {kind&&root?createPortal(<dialog ref={dialog} className={styles.dialog} aria-label="매장 예약·웨이팅" onCancel={event=>{event.preventDefault();setKind(null)}}><header><strong>{kind==='reservation'?'예약하기':'웨이팅 접수·내 순번'}</strong><button onClick={()=>setKind(null)} aria-label="예약·웨이팅 팝업 닫기"><X size={20}/></button></header>{!loaded?<p role="status" className={styles.loading}>매장 예약 정보를 불러오고 있어요…</p>:null}<iframe key={`${slug}-${kind}`} title="NOWGO 매장 예약·웨이팅 접수" src={`${root}?kind=${kind}&embed=1`} onLoad={()=>setLoaded(true)} referrerPolicy="strict-origin-when-cross-origin" /></dialog>,document.body):null}
 </>;
}
