'use client';
import {useEffect,useState} from 'react';
import Brand from '@/components/brand';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {returnPath} from '@/lib/integration-policy';
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
   if(membership.existingOwner){sessionStorage.removeItem('rich-pending-consent');location.replace('/');return}
   const raw=sessionStorage.getItem('rich-pending-consent');
   const pending=raw?JSON.parse(raw) as {returnTo?:string}:null;
   const returnTo=returnPath(pending?.returnTo);
   sessionStorage.removeItem('rich-pending-consent');
   const profile=await api<{customer:unknown|null;consentRequired:boolean}>('/api/customer/me');
   if(!active)return;
   location.replace(profile.customer&&!profile.consentRequired?returnTo:'/account/join?finish=1&returnTo='+encodeURIComponent(returnTo));
  }catch(e){if(active)setError((e as Error).message)}
 }void complete();return()=>{active=false}},[]);
 return <main className="terms-page join-page"><Brand/><h1>회원 연결 중</h1><p>{error||'NOWGO 통합회원 정보를 확인하고 있어요.'}</p>{error&&<a href="/account/join">가입·로그인 다시 하기 ↗</a>}</main>
}
