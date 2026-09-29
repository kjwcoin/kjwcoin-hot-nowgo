'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client';
import {browserDb} from '@/lib/supabase-browser';
const hub='https://www.nowgo.space';
export default function RegularFavorite({placeId,slug,isDemo}:{placeId:string;slug?:string|null;isDemo?:boolean}){
 const storeId=!isDemo&&/^nowgo-[a-f0-9-]{36}$/i.test(placeId)?placeId.slice(6):null;
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
 if(!storeId||!slug)return null;
 async function toggle(){setBusy(true);setMessage('');try{const state=await api<{registered:boolean}>('/api/customer/favorite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeId,active:!registered})});setRegistered(state.registered);setMessage(state.registered?'내 단골 목록에 담았어요.':'목록에서 해제했어요. 방문 기록은 보관됩니다.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 return <section aria-label="나의 단골" style={{padding:'16px 0',borderTop:'1px solid #ddd',marginTop:12}}>
  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>{signedIn?<button type="button" className="submit-button" style={{width:'auto',margin:0}} disabled={busy} aria-pressed={registered} onClick={()=>void toggle()}>{busy?'확인 중…':registered?'♥ 단골 등록됨 · 해제':'♡ 단골 등록'}</button>:<a className="submit-button" style={{width:'auto',margin:0}} href={`/account/join?type=user&returnTo=${encodeURIComponent(`/place/${placeId}`)}`}>{busy?'계정 확인 중…':'로그인하고 단골 등록'}</a>}<a className="text-link" href={`${hub}/regular/home`}>내 단골 목록 ↗</a></div>
  <p style={{fontSize:13,lineHeight:1.6,margin:'10px 0 0'}}>서로 다른 날 2회 방문하고 GPS·결제 인증을 모두 채우면 자동 단골이 돼요. <a href={`${hub}/p/${encodeURIComponent(slug)}/loyalty`}>방문 인증 확인 ↗</a></p>
  {message?<p role="status" style={{fontSize:13}}>{message}</p>:null}
 </section>;
}
