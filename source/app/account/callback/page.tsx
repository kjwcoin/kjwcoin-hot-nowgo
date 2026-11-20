'use client';
import {useEffect,useState} from 'react';
import FlavorHeader from '@/components/flavor-header';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {APP_RETURN_COOKIE,readAppReturnCookie} from '@/lib/integration-policy';
import {ownerReturnPath,returnPath} from '@/lib/integration-policy';
import {variantForHost} from '@/lib/site-config';
export default function Callback(){
 const [error,setError]=useState(''),[ownerRetry,setOwnerRetry]=useState<string|null>(null);
 useEffect(()=>{let active=true;async function complete(){
  let pending:{returnTo?:string;accountType?:'user'|'owner'}|null=null;
  try{const raw=sessionStorage.getItem(`${variantForHost(location.host)}-pending-consent`);pending=raw?JSON.parse(raw):null}catch{}
  const appReturn=readAppReturnCookie(document.cookie);
  const webOwner=pending?.accountType==='owner'&&!appReturn;
  const safeOwnerReturn=webOwner?ownerReturnPath(pending?.returnTo):null;
  const ownerHref=webOwner?'/account/join?type=owner&returnTo='+encodeURIComponent(safeOwnerReturn??'/owner/dashboard'):null;
  try{
   const search=new URLSearchParams(location.search),code=search.get('code');
   if(webOwner&&(!code||search.has('error')||search.has('error_code')))throw new Error('점주 로그인을 완료하지 못했어요. 다시 시도해 주세요.');
   const db=browserDb();
   if(code){const {error:exchangeError}=await db.auth.exchangeCodeForSession(code);if(exchangeError)throw exchangeError}
   const {data,error:sessionError}=await db.auth.getSession();
   if(sessionError||!data.session)throw sessionError||new Error('로그인을 완료하지 못했어요. 다시 시도해 주세요.');
   const membership=await api<{existingOwner:boolean}>('/api/customer/login-target');
   if(!active)return;
   const accountType=pending?.accountType==='owner'?'owner':'user';
   const returnTo=safeOwnerReturn??returnPath(appReturn||pending?.returnTo);
   const ownerSignup=returnTo.startsWith('/owner/signup')?returnTo:'/owner/signup';
   if(appReturn)document.cookie=APP_RETURN_COOKIE+'=; Path=/; Max-Age=0; Secure; SameSite=Lax';
   try{sessionStorage.removeItem(`${variantForHost(location.host)}-pending-consent`)}catch{}
   if(membership.existingOwner&&accountType==='owner'&&!appReturn){location.replace(ownerReturnPath(returnTo)??'/owner/dashboard');return}
   const profile=await api<{customer:unknown|null;consentRequired:boolean}>('/api/customer/me');
   if(!active)return;
   location.replace(profile.customer&&!profile.consentRequired?(returnTo.startsWith('/app/')?returnTo:accountType==='owner'?ownerSignup:(returnTo.startsWith('/app/')?'/':returnTo)):'/account/join?finish=1&type='+accountType+'&returnTo='+encodeURIComponent(returnTo));
  }catch(e){if(active){setOwnerRetry(ownerHref);setError((e as Error).message)}}
 }void complete();return()=>{active=false}},[]);
 return <><FlavorHeader/><main className="terms-page join-page"><h1>회원 연결 중</h1><p>{error||'NOWGO 통합회원 정보를 확인하고 있어요.'}</p>{error&&<a href={ownerRetry??"/account/join"}>{ownerRetry?"점주 로그인 다시 하기 ↗":"가입·로그인 다시 하기 ↗"}</a>}</main></>
}
