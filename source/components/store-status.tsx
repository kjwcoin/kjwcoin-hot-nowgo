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
export default function StoreStatus({menuId,isDemo,ownerRegistered=false}:{menuId:string;isDemo:boolean;ownerRegistered?:boolean}){
 const canShowStatus=ownerRegistered&&!isDemo;
 const [state,setState]=useState<OfficialStatus|null>(null),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{if(!canShowStatus)return;let active=true;const refresh=()=>api<OfficialStatus>('/api/place-status/'+encodeURIComponent(menuId)).then(d=>{if(active)setState(d)}).catch(()=>{if(active)setState(null)});void refresh();const t=setInterval(refresh,60000);window.addEventListener('focus',refresh);return()=>{active=false;clearInterval(t);window.removeEventListener('focus',refresh)}},[menuId,canShowStatus]);
 useEffect(()=>{if(!canShowStatus)return;const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t)},[canShowStatus]);
 useEffect(()=>{if(!state?.validUntil)return;const delay=Date.parse(state.validUntil)-Date.now();const timer=setTimeout(()=>setState(null),Math.max(0,delay));return()=>clearTimeout(timer)},[state]);
 if(!canShowStatus)return <section className="store-status" aria-label={isDemo?'가매장 영업현황':'제보자 등록매장 영업현황'}><strong>{isDemo?'가매장':'제보자 등록매장'}</strong><p>영업현황 확인불가<br/>점주 가입 시, 실시간 영업현황 보기 가능</p></section>;
 const displayState=state?.validUntil&&Date.parse(state.validUntil)<=now?null:state;
 const updated=elapsed(displayState?.checkedAt||null,now);
 return <section className="store-status" aria-label="NOWGO 매장 상태"><dl><div><dt>실시간 영업</dt><dd className={displayState?.fresh?'fresh-status':''}>{displayState?.open||'확인 필요'}</dd></div><div><dt>혼잡도</dt><dd>{displayState?.crowding||'확인 필요'}</dd></div><div><dt>이 메뉴</dt><dd>{displayState?.menu||'확인 필요'}</dd></div></dl><p>{displayState?.source||'NOWGO 매장 연결 준비 중'}{updated&&<><br/>점주 설정 · {updated} 갱신</>}</p></section>
}
