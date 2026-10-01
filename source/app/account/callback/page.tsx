'use client';
import {useEffect,useState} from 'react';
import FlavorHeader from '@/components/flavor-header';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
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
   if(membership.existingOwner){sessionStorage.removeItem(`${variantForHost(location.host)}-pending-consent`);location.replace('/');return}
   const raw=sessionStorage.getItem(`${variantForHost(location.host)}-pending-consent`);
   const pending=raw?JSON.parse(raw) as {returnTo?:string;accountType?:'user'|'owner'}:null;
   const returnTo=returnPath(pending?.returnTo);
   const accountType=pending?.accountType==='owner'?'owner':'user';
   sessionStorage.removeItem(`${variantForHost(location.host)}-pending-consent`);
   const profile=await api<{customer:unknown|null;consentRequired:boolean}>('/api/customer/me');
   if(!active)return;
   location.replace(profile.customer&&!profile.consentRequired?(accountType==='owner'?'/owner':'https://www.nowgo.space/flavors'):'/account/join?finish=1&type='+accountType+'&returnTo='+encodeURIComponent(returnTo));
  }catch(e){if(active)setError((e as Error).message)}
 }void complete();return()=>{active=false}},[]);
 return <><FlavorHeader/><main className="terms-page join-page"><h1>회원 연결 중</h1><p>{error||'NOWGO 통합회원 정보를 확인하고 있어요.'}</p>{error&&<a href="/account/join">가입·로그인 다시 하기 ↗</a>}</main></>
}
