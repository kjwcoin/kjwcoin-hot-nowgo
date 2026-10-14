'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import type {SiteVariant} from '@/lib/site-config';
import {browserDb,ensureUnifiedSession} from '@/lib/supabase-browser';
const MapExplorer=dynamic(()=>import('@/components/map-explorer'));
type AccessState='checking'|'signed-in'|'signed-out';
export default function HotMapAccessGate({variant='hot'}:{variant?:SiteVariant}){
 const [access,setAccess]=useState<AccessState>('checking');
 useEffect(()=>{
  if(variant!=='hot'){setAccess('signed-in');return}
  let active=true;
  let db:ReturnType<typeof browserDb>;
  try{db=browserDb()}catch{setAccess('signed-out');return}
  const {data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{
   if(active&&event!=='INITIAL_SESSION')setAccess(session&&!session.user.is_anonymous?'signed-in':'signed-out');
  });
  void (async()=>{try{await ensureUnifiedSession();const {data:{session}}=await db.auth.getSession();if(active)setAccess(session&&!session.user.is_anonymous?'signed-in':'signed-out')}catch{if(active)setAccess('signed-out')}})();
  return()=>{active=false;subscription.unsubscribe()};
 },[variant]);
 if(variant!=='hot'||access==='signed-in')return <MapExplorer variant={variant}/>;
 return <main className="hot-map-access">
  <div className="hot-map-access-backdrop" aria-hidden="true" inert>
   <MapExplorer variant={variant} accessLocked/>
  </div>
  <div className="hot-map-access-overlay">
   <section className="hot-map-access-card" role="dialog" aria-modal="true" aria-labelledby="hot-access-title">
    <span className="hot-access-mark" aria-hidden="true">H</span>
    <div className="hot-access-bubble" id="hot-access-title">통합로그인해야 볼 수 있어요</div>
    <p>가입하면 지도위에 핀들이 보여요</p>
    <a className="hot-access-login" href="/account/join?type=user&returnTo=%2F">통합로그인 / 회원가입</a>
    <nav className="hot-access-account-links" aria-label="계정 메뉴"><a className="hot-access-account" href="/account">내 계정</a><a className="hot-access-account" href="/account/join?type=owner&returnTo=%2Fowner%2Fdashboard">내 매장</a></nav>
   </section>
  </div>
 </main>;
}
