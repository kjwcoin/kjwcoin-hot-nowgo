'use client';
import {useEffect,useState} from 'react';
import FlavorHeader from '@/components/flavor-header';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {APP_RETURN_COOKIE,readAppReturnCookie} from '@/lib/integration-policy';
import {returnPath} from '@/lib/integration-policy';
import {variantForHost} from '@/lib/site-config';
export default function Callback(){
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;async function complete(){
  try{
   const db=browserDb();
   const code=new URLSearchParams(location.search).get('code');
   if(code){const {error:exchangeError}=await db.auth.exchangeCodeForSession(code);if(exchangeError)throw exchangeError}
   const {data,error:sessionError}=await db.auth.getSession();
   if(sessionError||!data.session)throw sessionError||new Error('로그인을 완료하지 못했어요. 다시 시도해 주세요.');
   const membership=await api<{existingOwner:boolean}>('/api/customer/login-target');
   if(!active)return;
   let pending:{returnTo?:string;accountType?:'user'|'owner'}|null=null;
   try{const raw=sessionStorage.getItem(`${variantForHost(location.host)}-pending-consent`);pending=raw?JSON.parse(raw):null}catch{}
   const appReturn=readAppReturnCookie(document.cookie);
   const returnTo=returnPath(appReturn||pending?.returnTo);
   if(appReturn)document.cookie=APP_RETURN_COOKIE+'=; Path=/; Max-Age=0; Secure; SameSite=Lax';
   const accountType=pending?.accountType==='owner'?'owner':'user';
   try{sessionStorage.removeItem(`${variantForHost(location.host)}-pending-consent`)}catch{}
   if(membership.existingOwner){location.replace(pending||appReturn?returnTo:'/owner');return}
   const profile=await api<{customer:unknown|null;consentRequired:boolean}>('/api/customer/me');
   if(!active)return;
   location.replace(profile.customer&&!profile.consentRequired?(returnTo.startsWith('/app/')?returnTo:accountType==='owner'?(returnTo.startsWith('/owner')?returnTo:'/owner/signup'):'https://www.nowgo.space/flavors'):'/account/join?finish=1&type='+accountType+'&returnTo='+encodeURIComponent(returnTo));
  }catch(e){if(active)setError((e as Error).message)}
 }void complete();return()=>{active=false}},[]);
 return <><FlavorHeader/><main className="terms-page join-page"><h1>회원 연결 중</h1><p>{error||'NOWGO 통합회원 정보를 확인하고 있어요.'}</p>{error&&<a href="/account/join">가입·로그인 다시 하기 ↗</a>}</main></>
}
