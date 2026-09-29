'use client';
import {useCallback,useEffect,useState} from 'react';
import {Gift} from 'lucide-react';
import {api} from '@/lib/client';
import type {Planet} from '@/lib/activity/model';
import './sponsor-event.css';

type Event={id:string;sponsor:string;title:string;prize_type:'discount'|'ticket'|'voucher';prize_label:string;eligibility:'login'|'verified_activity';ends_at:string};
type Draw={event_id:string;local_day:string;prize_label:string|null;code:string|null};
const examples:Record<Planet,{brand:string;prize:string}>={
 hot:{brand:'신라면',prize:'신라면 할인권'},
 sweet:{brand:'배스킨라빈스 31',prize:'아이스크림 할인권'},
 chewy:{brand:'초코파이',prize:'초코파이 교환권'}
};
export default function SponsorEvent({planet}:{planet:Planet}){
 const [events,setEvents]=useState<Event[]>([]),[draws,setDraws]=useState<Draw[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<string|null>(null),[notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{try{const data=await api<{events:Event[];draws:Draw[]}>('/api/sponsor-events');setEvents(data.events);setDraws(data.draws)}catch{setNotice('이벤트 정보를 불러오지 못했어요.')}finally{setLoading(false)}},[]);
 useEffect(()=>{void refresh()},[refresh]);
 async function draw(id:string){setBusy(id);setNotice('');try{const result=await api<{won:boolean;prize:string|null;code:string|null}>('/api/sponsor-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:id})});setNotice(result.won?`${result.prize} 당첨! 혜택 코드는 내 혜택함에 보관했어요.`:'이번에는 아쉽게 당첨되지 않았어요.');await refresh()}catch(e){setNotice((e as Error).message)}finally{setBusy(null)}}
 const example=examples[planet];
 return <section className="se-section aw-panel" aria-labelledby="sponsor-event-title">
  <div className="se-heading"><Gift size={24}/><div><h2 id="sponsor-event-title">오늘의 이벤트</h2><p>광고주 혜택이 열리면 할인권·입장권 등을 뽑을 수 있어요.</p></div></div>
  {loading?<p role="status">이벤트를 확인하고 있어요.</p>:events.length?events.map(event=>{const today=draws.find(d=>d.event_id===event.id&&d.local_day===new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));return <article className="se-card" key={event.id}><span className="se-label">진행 중 · {event.sponsor}</span><h3>{event.title}</h3><p>{event.prize_label} · {event.prize_type==='ticket'?'입장권':event.prize_type==='discount'?'할인권':'교환권'}</p><small>{event.eligibility==='verified_activity'?'이벤트 시작 후 인증 방문 또는 채택된 제보로 참여 · ':''}하루 한 번 · {new Date(event.ends_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}까지</small><button disabled={!!busy||!!today} onClick={()=>void draw(event.id)}>{today?'오늘 참여 완료':busy===event.id?'추첨 중…':'혜택 뽑기'}</button></article>}):<article className="se-card se-preview"><span className="se-label">제휴 예시 · 실제 행사 아님</span><h3>{example.brand} 혜택 뽑기</h3><p>{example.prize}</p><button disabled>이벤트 준비 중</button></article>}
  {notice&&<p role="status" className="se-notice">{notice}</p>}
  {draws.some(d=>d.code)&&<div className="se-wallet"><h3>내 혜택함</h3>{draws.filter(d=>d.code).map(d=><p key={`${d.event_id}-${d.local_day}`}><strong>{d.prize_label}</strong><span>{d.code}</span><small>{d.local_day} 당첨</small></p>)}</div>}
 </section>;
}
