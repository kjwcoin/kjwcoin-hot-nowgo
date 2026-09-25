'use client';
import {useEffect,useState} from 'react';
import Brand from '@/components/brand';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {returnPath} from '@/lib/integration-policy';
import {siteConfig,variantForHost} from '@/lib/site-config';
export default function Callback(){
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;async function complete(){
  try{
   const db=browserDb();
   const {data,error:sessionError}=await db.auth.getSession();
   if(sessionError||!data.session)throw sessionError||new Error('로그인을 완료하지 못했어요. 다시 시도해 주세요.');
   const raw=sessionStorage.getItem(`${variantForHost(location.host)}-pending-consent`);
   const pending=raw?JSON.parse(raw) as {essential?:boolean;marketingEmail?:boolean;returnTo?:string}:null;
   if(!pending?.essential){location.replace('/account/join?finish=1');return}
   await api('/api/customer/consents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({essential:true,marketingEmail:!!pending.marketingEmail,version:siteConfig(variantForHost(location.host)).consent})});
   sessionStorage.removeItem(`${variantForHost(location.host)}-pending-consent`);
   window.dispatchEvent(new Event('hot-customer-change'));
   location.replace(returnPath(pending.returnTo));
  }catch(e){if(active)setError((e as Error).message)}
 }void complete();return()=>{active=false}},[]);
 return <main className="terms-page join-page"><Brand/><h1>회원 연결 중</h1><p>{error||'NOWGO 통합회원 정보를 확인하고 있어요.'}</p>{error&&<a href="/account/join">가입·로그인 다시 하기 ↗</a>}</main>
}
