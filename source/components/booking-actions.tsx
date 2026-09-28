'use client';
import {useEffect,useState} from 'react';
import {CalendarClock,UsersRound} from 'lucide-react';
type Snapshot={linked:boolean;slug?:string;waitingCount?:number;reservationsEnabled?:boolean;waitingEnabled?:boolean};
const base={minHeight:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,borderRadius:8,fontSize:13,fontWeight:700,lineHeight:1.2,textDecoration:'none',textAlign:'center'} as const;
export default function BookingActions({placeId,isDemo}:{placeId:string;isDemo:boolean}){
 const [state,setState]=useState<Snapshot|null>(null);
 useEffect(()=>{if(isDemo)return;let live=true;const refresh=()=>fetch(`/api/booking-state/${encodeURIComponent(placeId)}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(live)setState(d)}).catch(()=>{if(live)setState(null)});void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},15000);window.addEventListener('focus',refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener('focus',refresh)}},[placeId,isDemo]);
 const slug=state?.linked&&state.slug?state.slug:null;
 const root=slug?`https://www.nowgo.space/p/${encodeURIComponent(slug)}/book`:null;
 const closed={...base,border:'1px solid #ded8ce',background:'#f5f2eb',color:'#625b50'};
 return <>
  {root?<a className="explorer-action" style={{...base,border:'1px solid #bd3828',background:'#fff',color:'#842719'}} href={`${root}?kind=reservation`}><CalendarClock size={18}/><span>예약하기</span><small>{state?.reservationsEnabled?'신청 가능':'접수 마감'}</small></a>:<span className="explorer-action" style={closed} aria-disabled="true"><CalendarClock size={18}/><span>예약하기</span><small>{isDemo?'가매장':'매장 연결 전'}</small></span>}
  {root?<a className="explorer-action" style={{...base,border:'1px solid #bd3828',background:'#fff',color:'#842719'}} href={`${root}?kind=waiting`}><UsersRound size={18}/><span>웨이팅 {state?.waitingCount??0}팀</span><small>{state?.waitingEnabled?'접수하기':'접수 마감'}</small></a>:<span className="explorer-action" style={closed} aria-disabled="true"><UsersRound size={18}/><span>웨이팅수 보기</span><small>{isDemo?'가매장':'매장 연결 전'}</small></span>}
 </>;
}
