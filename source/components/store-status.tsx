'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
import type {OfficialStatus} from '@/lib/integration-policy';
export default function StoreStatus({menuId,isDemo}:{menuId:string;isDemo:boolean}){
 const [state,setState]=useState<OfficialStatus|null>(null);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)setState(null)});const refresh=()=>api<OfficialStatus>('/api/place-status/'+encodeURIComponent(menuId)).then(d=>{if(active)setState(d)}).catch(()=>{if(active)setState(null)});if(!isDemo)void refresh();const t=setInterval(()=>{if(!isDemo)void refresh()},60000);window.addEventListener('focus',refresh);return()=>{active=false;clearInterval(t);window.removeEventListener('focus',refresh)}},[menuId,isDemo]);
 useEffect(()=>{if(!state?.validUntil)return;const delay=Date.parse(state.validUntil)-Date.now();const timer=setTimeout(()=>setState(null),Math.max(0,delay));return()=>clearTimeout(timer)},[state]);
 return <section className="store-status" aria-label="NOWGO 매장 상태"><dl><div><dt>매장 영업</dt><dd className={state?.fresh?'fresh-status':''}>{isDemo?'가매장':state?.open||'확인 필요'}</dd></div><div><dt>이 메뉴</dt><dd>{isDemo?'실제 판매하지 않음':state?.menu||'확인 필요'}</dd></div></dl><p>{isDemo?'현실에 없는 개발용 매장입니다.':state?.source||'NOWGO 매장 연결 준비 중'}{state?.checkedAt&&<><br/>확인 {new Date(state.checkedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</>}</p></section>
}
