'use client';
import {useState,useSyncExternalStore,type ReactNode} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {variantForHost,type SiteVariant} from '@/lib/site-config';

export default function RegularHomeLink({variant,className,children,destination}:{variant?:SiteVariant;className?:string;children:ReactNode;destination?:'/owner/dashboard'}){
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
   if(destination){const next=document.createElement('input');next.type='hidden';next.name='next';next.value=destination;form.append(next)}
   document.body.append(form);form.submit();
  }catch{setError('계정 연결을 확인하지 못했어요. 다시 눌러 주세요.');setBusy(false)}
 }
 return <><a className={className} href={destination?`https://nowgo.space${destination}`:`https://nowgo.space/regular/home?flavor=${flavor}`} aria-disabled={busy} onClick={event=>{event.preventDefault();void open()}}>{busy?'연결 중…':children}</a>{error&&<span role="alert">{error}</span>}</>;
}
