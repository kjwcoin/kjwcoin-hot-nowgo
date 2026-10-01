'use client';
import {useState,useSyncExternalStore,type ReactNode} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {variantForHost,type SiteVariant} from '@/lib/site-config';

export default function RegularHomeLink({variant,className,children}:{variant?:SiteVariant;className?:string;children:ReactNode}){
 const hostVariant=useSyncExternalStore(()=>()=>{},()=>variantForHost(window.location.hostname),()=> 'hot' as SiteVariant);
 const flavor=variant??hostVariant;
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function open(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const {data,error:sessionError}=await browserDb().auth.getSession();
   if(sessionError)throw sessionError;
   if(!data.session||data.session.user.is_anonymous){window.location.assign(`/account/join?type=user&returnTo=${encodeURIComponent(window.location.pathname+window.location.search)}`);return}
   // A top-level POST lets the common home create its own cookies. Never put a credential in a URL.
   const form=document.createElement('form');form.method='POST';form.action='https://nowgo.space/auth/planet-session';
   const input=document.createElement('input');input.type='hidden';input.name='access_token';input.value=data.session.access_token;form.append(input);
   document.body.append(form);form.submit();
  }catch{setError('단골홈 연결을 확인하지 못했어요. 다시 눌러 주세요.');setBusy(false)}
 }
 return <><a className={className} href={`https://nowgo.space/regular/home?flavor=${flavor}`} aria-disabled={busy} onClick={event=>{event.preventDefault();void open()}}>{busy?'단골홈 여는 중…':children}</a>{error&&<span role="alert">{error}</span>}</>;
}
