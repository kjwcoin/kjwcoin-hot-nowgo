'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
import type {OfficialStatus} from '@/lib/integration-policy';
export default function StoreStatus({menuId,isDemo}:{menuId:string;isDemo:boolean}){
 const [state,setState]=useState<OfficialStatus|null>(null);
 useEffect(()=>{let active=true;setState(null);const refresh=()=>api<OfficialStatus>('/api/place-status/'+encodeURIComponent(menuId)).then(d=>{if(active)setState(d)}).catch(()=>{if(active)setState(null)});if(!isDemo)void refresh();const t=setInterval(()=>{if(!isDemo)void refresh()},180000);window.addEventListener('focus',refresh);return()=>{active=false;clearInterval(t);window.removeEventListener('focus',refresh)}},[menuId,isDemo]);
 useEffect(()=>{if(!state?.validUntil)return;const delay=Date.parse(state.validUntil)-Date.now();if(delay<=0){setState(null);return}const timer=setTimeout(()=>setState(null),delay);return()=>clearTimeout(timer)},[state]);
 if(isDemo){const demo=menuId.endsWith('02')?{label:'재료 소진 마감',updated:'1분 전 갱신',color:'#b34a42'}:menuId.endsWith('03')?{label:'영업 중',updated:'1분 전 갱신',color:'#267b54'}:{label:'영업 중',updated:'3분 전 갱신',color:'#267b54'};return <section className="store-status" aria-label="가매장 영업 상태" style={{margin:'12px 0',padding:'11px 12px',border:'1px solid #ded8ce',borderRadius:10,background:'#fbfaf6'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><strong style={{color:demo.color}}>{demo.label}</strong><span style={{fontSize:12,color:'#766f64'}}>{demo.updated}</span></div><small style={{display:'block',marginTop:5,color:'#8d867b'}}>가매장 상태 시안 · 실제 운영 정보가 아닙니다.</small></section>}
 return <section className="store-status" aria-label="NOWGO 매장 상태"><dl><div><dt>매장 영업</dt><dd className={state?.fresh?'fresh-status':''}>{state?.open||'확인 필요'}</dd></div><div><dt>이 메뉴</dt><dd>{state?.menu||'확인 필요'}</dd></div></dl><p>{state?.source||'NOWGO 매장 연결 준비 중'}{state?.checkedAt&&<><br/>확인 {new Date(state.checkedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</>}</p></section>
}
