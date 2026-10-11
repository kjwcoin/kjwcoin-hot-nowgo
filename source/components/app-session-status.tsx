'use client';
import {useEffect} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {APP_PARENT_ORIGIN,isAppLoginChannel} from '@/lib/app-embed';

// Only a verified status leaves this origin. Credentials remain in its SDK storage.
export default function AppSessionStatus(){
 useEffect(()=>{
  let active=true,channel='',generation=0;
  let parentOrigin='';try{parentOrigin=new URL(document.referrer).origin}catch{}
  if(window.parent===window||![location.origin,APP_PARENT_ORIGIN].includes(parentOrigin))return;
  const db=browserDb();
  const send=(status:'authenticated'|'signed-out'|'error')=>{if(active&&channel)window.parent.postMessage({type:'nowgo:session-state',channel,status},parentOrigin)};
  const check=async()=>{const run=++generation;try{
   const {data,error}=await db.auth.getSession();if(!active||run!==generation)return;
   if(error)throw error;
   if(!data.session||data.session.user.is_anonymous){send('signed-out');return}
   const profile=await api<{customer:unknown;consentRequired:boolean}>('/api/customer/me');
   if(active&&run===generation)send(profile.customer&&!profile.consentRequired?'authenticated':'signed-out');
  }catch{if(active&&run===generation)send('error')}};
  const receive=async(event:MessageEvent)=>{
   if(event.source!==window.parent||event.origin!==parentOrigin||!isAppLoginChannel(event.data?.channel))return;
   if(event.data.type==='nowgo:session-probe'){channel=event.data.channel;void check()}
   if(event.data.type==='nowgo:session-logout'&&event.data.channel===channel){generation++;try{localStorage.setItem('nowgo-explicit-logout','1')}catch{}const {error}=await db.auth.signOut({scope:'local'});if(error){try{localStorage.removeItem('nowgo-explicit-logout')}catch{}send('error')}else send('signed-out')}
  };
  const {data}=db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation++;send('signed-out')}else if(channel)setTimeout(()=>void check(),0)});
  window.addEventListener('message',receive);
  const focus=()=>{if(channel)void check()};window.addEventListener('focus',focus);
  return()=>{active=false;generation++;data.subscription.unsubscribe();window.removeEventListener('message',receive);window.removeEventListener('focus',focus)};
 },[]);
 return null;
}
