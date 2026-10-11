'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {api,ApiError} from '@/lib/client';
import {postAppEvent} from '@/lib/app-embed';
import type {SiteVariant} from '@/lib/site-config';
import styles from './owner-join-request.module.css';
type State={count:number;requested:boolean;ownerRegistered:boolean};
export default function OwnerJoinRequest({menuId,isDemo,ownerRegistered,appVariant,compact=false}:{menuId:string;isDemo?:boolean;ownerRegistered?:boolean;appVariant?:SiteVariant;compact?:boolean}){
 const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[login,setLogin]=useState(false);
 const sequence=useRef(0),saving=useRef(false);
 const eligible=!isDemo&&!ownerRegistered;
 const load=useCallback(async()=>{const run=++sequence.current;try{const data=await api<State>('/api/owner-join-requests?menuId='+encodeURIComponent(menuId));if(run===sequence.current)setState(data)}catch{if(run===sequence.current)setState(null)}},[menuId]);
 useEffect(()=>{if(!eligible)return;void load();const refresh=()=>{if(!document.hidden)void load()};window.addEventListener('focus',refresh);window.addEventListener('nowgo-owner-join-request',refresh);window.addEventListener('hot-customer-change',refresh);const timer=compact?null:setInterval(refresh,30000);return()=>{sequence.current++;window.removeEventListener('focus',refresh);window.removeEventListener('nowgo-owner-join-request',refresh);window.removeEventListener('hot-customer-change',refresh);if(timer)clearInterval(timer)}},[eligible,load,compact]);
 async function requestJoin(){if(saving.current||state?.requested)return;saving.current=true;setBusy(true);setMessage('');setLogin(false);const run=++sequence.current;try{const data=await api<State>('/api/owner-join-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({menuId})});if(run!==sequence.current)return;setState(data);setMessage('점주 가입 요청을 남겼어요. 같은 매장에는 한 번만 집계돼요.');window.dispatchEvent(new Event('nowgo-owner-join-request'))}catch(error){if(run!==sequence.current)return;setMessage(error instanceof Error?error.message:'요청을 저장하지 못했어요. 다시 눌러 주세요.');if(error instanceof ApiError&&error.status===401)setLogin(true)}finally{saving.current=false;setBusy(false)}}
 if(!eligible||state?.ownerRegistered)return null;
 return <section className={styles.sticker} data-owner-join-request aria-label="점주 가입 요청">
  {!compact&&<p>이 가게의 실시간 영업현황을 보고 싶나요?</p>}
  <button type="button" className={styles.button} disabled={busy||state?.requested} aria-pressed={state?.requested===true} onClick={()=>void requestJoin()}>{busy?'요청 저장 중…':state?.requested?'✓ 점주 가입 요청 완료':'＋ 점주 가입 요청'}{state&&<span>{state.count.toLocaleString('ko-KR')}명</span>}</button>
  {!compact&&<small>소비자 요청이 매장별로 쌓여요. 점주 가입 전에는 영업현황 확인불가</small>}
  {message&&<p role="status">{message}</p>}
  {login&&(appVariant?<button type="button" className={styles.login} onClick={()=>postAppEvent({type:'nowgo:sign-in',brand:appVariant})}>로그인하고 요청하기</button>:<a className={styles.login} href={`/account/join?type=user&returnTo=${encodeURIComponent('/?report='+menuId)}`}>로그인하고 요청하기 ↗</a>)}
 </section>;
}
