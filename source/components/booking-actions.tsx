'use client';
import {useEffect,useState} from 'react';
import {CalendarClock,UsersRound} from 'lucide-react';
export default function BookingActions({slug,isDemo,accent}:{slug?:string|null;isDemo?:boolean;accent:string}){
 const [state,setState]=useState<{slug:string;reservation:boolean;waiting:boolean;count:number}|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!slug||isDemo)return;
  let alive=true;
  const refresh=async()=>{try{const response=await fetch(`/api/booking-options?slug=${encodeURIComponent(slug)}`,{cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();if(alive){setState({slug,reservation:data.reservationsEnabled,waiting:data.waitingEnabled,count:data.waitingCount});setFailed(false)}}catch{if(alive)setFailed(true)}};
  void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},15000);window.addEventListener('focus',refresh);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',refresh)};
 },[slug,isDemo]);
 const current=state?.slug===slug&&!failed?state:null;
 return <>{(['reservation','waiting'] as const).map(kind=>{
  const enabled=!isDemo&&!!current?.[kind];
  const body=<>{kind==='reservation'?<CalendarClock size={18}/>:<UsersRound size={18}/>}<span>{kind==='reservation'?'예약하기':'웨이팅 접수'}</span><small>{isDemo?'가매장':!slug?'매장 연결 필요':failed?'확인 불가':!current?'확인 중':enabled?(kind==='waiting'?`대기 ${current.count}팀`:'시간 선택'):'접수 마감'}</small></>;
  const style={minHeight:66,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:3,border:`1px solid ${enabled?accent:'#ded8ce'}`,borderRadius:8,background:enabled?'#fff':'#f5f2eb',color:enabled?accent:'#766f64',fontSize:14,fontWeight:700,lineHeight:1.3,textDecoration:'none'};
  return enabled&&slug?<a key={kind} style={style} href={`https://www.nowgo.space/p/${encodeURIComponent(slug)}/book?kind=${kind}`}>{body}</a>:<span key={kind} style={style} aria-disabled="true">{body}</span>;
 })}</>;
}
