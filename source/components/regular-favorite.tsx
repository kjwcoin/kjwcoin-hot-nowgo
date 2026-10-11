'use client';
import {postAppEvent} from '@/lib/app-embed';
import type {SiteVariant} from '@/lib/site-config';
import RegularHomeLink from './regular-home-link';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client';
import {browserDb} from '@/lib/supabase-browser';
import styles from './regular-favorite.module.css';
const hub='https://www.nowgo.space';
export default function RegularFavorite({placeId,slug,isDemo,compact=false,appVariant}:{placeId:string;slug?:string|null;isDemo?:boolean;compact?:boolean;appVariant?:SiteVariant}){
 const storeId=!isDemo&&/^nowgo-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(placeId)?placeId.slice(6):null;
 const [registered,setRegistered]=useState(false),[signedIn,setSignedIn]=useState(false),[busy,setBusy]=useState(true),[message,setMessage]=useState('');
 const generation=useRef(0);
 useEffect(()=>{
  if(!storeId)return;
  let alive=true;
  const load=async()=>{const run=++generation.current;setRegistered(false);setSignedIn(false);setBusy(true);setMessage('');try{const {data}=await browserDb().auth.getSession();if(!alive||run!==generation.current)return;if(!data.session||data.session.user.is_anonymous){setBusy(false);return}setSignedIn(true);const state=await api<{registered:boolean}>(`/api/customer/favorite?storeId=${storeId}`);if(alive&&run===generation.current)setRegistered(state.registered)}catch(e){if(alive)setMessage((e as Error).message)}finally{if(alive&&run===generation.current)setBusy(false)}};
  void load();const reload=()=>void load();window.addEventListener('focus',reload);
  let unsubscribe=()=>{};try{const {data}=browserDb().auth.onAuthStateChange(()=>{setTimeout(reload,0)});unsubscribe=()=>data.subscription.unsubscribe()}catch{}
  return()=>{alive=false;++generation.current;unsubscribe();window.removeEventListener('focus',reload)};
 },[storeId]);
 async function toggle(){if(!storeId||busy)return;const run=generation.current;setBusy(true);setMessage('');try{const state=await api<{registered:boolean}>('/api/customer/favorite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeId,active:!registered})});if(run!==generation.current)return;setRegistered(state.registered);setMessage(state.registered?'내 단골 목록에 담았어요.':'목록에서 해제했어요. 방문 기록은 보관됩니다.')}catch(e){if(run===generation.current)setMessage((e as Error).message)}finally{if(run===generation.current)setBusy(false)}}
 return <section aria-label="나의 단골" className={compact?styles.compact:styles.section}>
  <div className={styles.actions}>{!storeId?<button type="button" className={styles.save} title={isDemo?'가매장은 단골 목록에 저장되지 않아요.':'매장 정보가 연결되면 단골저장을 이용할 수 있어요.'} disabled>♡ 단골저장{isDemo?' · 가매장':''}</button>:signedIn||busy?<button type="button" className={styles.save} disabled={busy} aria-pressed={registered} onClick={()=>void toggle()}>{busy?'확인 중…':registered?'♥ 단골저장됨 · 해제':'♡ 단골저장'}</button>:appVariant?<button type="button" className={styles.save} onClick={()=>postAppEvent({type:'nowgo:sign-in',brand:appVariant,intent:'favorite',storeId})}>로그인하고 단골저장</button>:<a className={styles.save} aria-label="로그인하고 단골저장" href={`/account/join?type=user&returnTo=${encodeURIComponent(`/place/${placeId}`)}`}>{compact?'♡ 단골저장':'로그인하고 단골저장'}</a>}{!compact&&<RegularHomeLink className="text-link">내 단골 목록</RegularHomeLink>}</div>
  {!compact&&<p style={{fontSize:14,lineHeight:1.6,margin:'10px 0 0'}}>{isDemo?'가매장은 화면 예시이며 단골 목록에 저장되지 않아요.':!storeId?'매장 정보가 연결되면 단골저장을 이용할 수 있어요.':'단골저장을 누르면 내 ID의 목록에 바로 담겨요. 서로 다른 날 2회 방문하고 GPS·결제 인증을 모두 채우면 자동 단골이 돼요.'} {storeId&&slug?<a href={`${hub}/p/${encodeURIComponent(slug)}/loyalty`}>방문 인증 확인</a>:null}</p>}
  {message?<p role="status" style={{fontSize:13}}>{message}</p>:null}
 </section>;
}
