'use client';
import {postAppEvent} from '@/lib/app-embed';
import type {SiteVariant} from '@/lib/site-config';
import RegularHomeLink from './regular-home-link';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client';
import {browserDb,ensureUnifiedSession} from '@/lib/supabase-browser';
import styles from './regular-favorite.module.css';
const hub='https://www.nowgo.space';
export default function RegularFavorite({placeId,slug,isDemo,compact=false,appVariant}:{placeId:string;slug?:string|null;isDemo?:boolean;compact?:boolean;appVariant?:SiteVariant}){
 const storeId=!isDemo&&/^nowgo-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(placeId)?placeId.slice(6):null;
 const reported=!isDemo&&/^reported-[a-f0-9]{24}$/.test(placeId);
 const eligible=!!storeId||reported;
 const lookup=reported?'placeId='+encodeURIComponent(placeId):'storeId='+storeId;
 const [registered,setRegistered]=useState(false),[signedIn,setSignedIn]=useState(false),[busy,setBusy]=useState(true),[message,setMessage]=useState('');
 const generation=useRef(0),saving=useRef(false);
 useEffect(()=>{
  if(!eligible)return;
  let alive=true;
  const load=async()=>{if(saving.current)return;const run=++generation.current;setRegistered(false);setSignedIn(false);setBusy(true);setMessage('');try{await ensureUnifiedSession();const {data}=await browserDb().auth.getSession();if(!alive||run!==generation.current)return;if(!data.session||data.session.user.is_anonymous){setBusy(false);return}setSignedIn(true);const state=await api<{registered:boolean}>('/api/customer/favorite?'+lookup);if(alive&&run===generation.current)setRegistered(state.registered)}catch(e){if(alive)setMessage((e as Error).message)}finally{if(alive&&run===generation.current)setBusy(false)}};
  void load();const reload=()=>void load();window.addEventListener('focus',reload);window.addEventListener('nowgo-favorites-change',reload);
  let unsubscribe=()=>{};try{const {data}=browserDb().auth.onAuthStateChange(()=>{setTimeout(reload,0)});unsubscribe=()=>data.subscription.unsubscribe()}catch{}
  return()=>{alive=false;++generation.current;unsubscribe();window.removeEventListener('focus',reload);window.removeEventListener('nowgo-favorites-change',reload)};
 },[storeId,eligible,lookup]);
 async function toggle(){if(!eligible||busy||saving.current)return;saving.current=true;const run=generation.current;setBusy(true);setMessage('');try{const state=await api<{registered:boolean}>('/api/customer/favorite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reported?{placeId,active:!registered}:{storeId,active:!registered})});if(run!==generation.current)return;setRegistered(state.registered);setMessage(state.registered?'내 단골 목록에 담았어요.':'목록에서 해제했어요. 방문 기록은 보관됩니다.');window.dispatchEvent(new Event('nowgo-favorites-change'))}catch(e){if(run===generation.current)setMessage((e as Error).message)}finally{saving.current=false;if(run===generation.current)setBusy(false)}}
 return <section aria-label="나의 단골" className={compact?styles.compact:styles.section}>
  <div className={styles.actions}>{!eligible?<button type="button" className={styles.save} title="매장 정보가 연결되면 단골저장을 이용할 수 있어요." disabled>♡ 단골저장</button>:signedIn||busy?<button type="button" className={styles.save} disabled={busy} aria-pressed={registered} onClick={()=>void toggle()}>{busy?'확인 중…':registered?'♥ 단골저장됨 · 해제':'♡ 단골저장'}</button>:appVariant?<button type="button" className={styles.save} onClick={()=>postAppEvent(reported?{type:'nowgo:sign-in',brand:appVariant,placeId}:{type:'nowgo:sign-in',brand:appVariant,intent:'favorite',storeId})}>로그인하고 단골저장</button>:<a className={styles.save} aria-label="로그인하고 단골저장" href={`/account/join?type=user&returnTo=${encodeURIComponent(`/place/${placeId}`)}`}>{compact?'♡ 단골저장':'로그인하고 단골저장'}</a>}{!compact&&<RegularHomeLink className="text-link">내 단골 목록</RegularHomeLink>}</div>
  {!compact&&<p style={{fontSize:14,lineHeight:1.6,margin:'10px 0 0'}}>{!eligible?'매장 정보가 연결되면 단골저장을 이용할 수 있어요.':'단골저장을 누르면 내 ID의 목록에 바로 담겨요. 서로 다른 날 2회 방문하고 GPS·결제 인증을 모두 채우면 자동 단골이 돼요.'} {storeId&&slug?<a href={`${hub}/p/${encodeURIComponent(slug)}/loyalty`}>방문 인증 확인</a>:null}</p>}
  {message?<p role="status" style={{fontSize:13}}>{message}</p>:null}
 </section>;
}
