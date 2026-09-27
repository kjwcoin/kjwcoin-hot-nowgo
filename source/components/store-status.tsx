'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
import type {OfficialStatus} from '@/lib/integration-policy';
function elapsed(iso:string|null,now:number){
 if(!iso)return null;
 const minutes=Math.floor((now-Date.parse(iso))/60000);
 if(!Number.isFinite(minutes)||minutes<0)return null;
 return minutes===0?'방금 전':`${Math.min(minutes,99)}분 전`;
}
export default function StoreStatus({menuId,isDemo}:{menuId:string;isDemo:boolean}){
 const [state,setState]=useState<OfficialStatus|null>(null),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{let active=true;setState(null);const refresh=()=>api<OfficialStatus>('/api/place-status/'+encodeURIComponent(menuId)).then(d=>{if(active)setState(d)}).catch(()=>{if(active)setState(null)});if(!isDemo)void refresh();const t=setInterval(()=>{if(!isDemo)void refresh()},60000);window.addEventListener('focus',refresh);return()=>{active=false;clearInterval(t);window.removeEventListener('focus',refresh)}},[menuId,isDemo]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t)},[]);
 useEffect(()=>{if(!state?.validUntil)return;const delay=Date.parse(state.validUntil)-Date.now();if(delay<=0){setState(null);return}const timer=setTimeout(()=>setState(null),delay);return()=>clearTimeout(timer)},[state]);
 if(isDemo){const demo=menuId.endsWith('02')?{label:'재료 소진 마감',crowding:'혼잡',updated:'1분 전 갱신',color:'#b34a42'}:menuId.endsWith('03')?{label:'영업 중',crowding:'보통',updated:'1분 전 갱신',color:'#267b54'}:{label:'영업 중',crowding:'여유',updated:'3분 전 갱신',color:'#267b54'};return <section className="store-status" aria-label="가매장 영업 상태" style={{margin:'12px 0',padding:'11px 12px',border:'1px solid #ded8ce',borderRadius:10,background:'#fbfaf6'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><strong style={{color:demo.color}}>{demo.label}</strong><span style={{fontSize:12,color:'#766f64'}}>{demo.updated}</span></div><dl><div><dt>혼잡도</dt><dd>{demo.crowding}</dd></div></dl><small style={{display:'block',marginTop:5,color:'#8d867b'}}>가매장 상태 시안 · 실제 운영 정보가 아닙니다.</small></section>}
 const updated=elapsed(state?.checkedAt||null,now);
 return <section className="store-status" aria-label="NOWGO 매장 상태"><dl><div><dt>실시간 영업</dt><dd className={state?.fresh?'fresh-status':''}>{state?.open||'확인 필요'}</dd></div><div><dt>혼잡도</dt><dd>{state?.crowding||'확인 필요'}</dd></div><div><dt>이 메뉴</dt><dd>{state?.menu||'확인 필요'}</dd></div></dl><p>{state?.source||'NOWGO 매장 연결 준비 중'}{updated&&<><br/>점주 설정 · {updated} 갱신</>}</p></section>
}
