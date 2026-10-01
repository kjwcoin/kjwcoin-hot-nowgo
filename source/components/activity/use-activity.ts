'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client';
import {browserDb} from '@/lib/supabase-browser';
import type {ActivitySnapshot,Planet} from '@/lib/activity/model';

export function useActivity(planet:Planet){
 const [data,setData]=useState<ActivitySnapshot|null>(null);
 const [error,setError]=useState('');
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 const [owner,setOwner]=useState<boolean|null>(null);
 const [connected,setConnected]=useState(false);
 const request=useRef(0),account=useRef<string|null>(null);
 const refresh=useCallback(async()=>{
  const run=++request.current;
  let roleChecked=false;
  try{
   const {data:auth}=await browserDb().auth.getSession();
   if(run!==request.current)return;
   if(!auth.session||auth.session.user.is_anonymous){
    account.current=null;setSignedIn(false);setOwner(null);setData(null);setError('');return;
   }
   if(account.current!==auth.session.user.id){
    account.current=auth.session.user.id;setOwner(null);setData(null);
   }
   setSignedIn(true);
   // Membership comes from a server-verified identity, never editable user metadata.
   const role=await api<{existingOwner:boolean}>('/api/customer/login-target');
   if(run!==request.current)return;
   if(typeof role.existingOwner!=='boolean')throw new Error('계정을 확인하지 못했어요.');
   roleChecked=true;setOwner(role.existingOwner);
   if(role.existingOwner){setData(null);setError('');return;}
   const snapshot=await api<ActivitySnapshot>('/api/activity/snapshot');
   if(run!==request.current)return;
   setData(snapshot);setError('');
  }catch(e){
   if(run===request.current){if(!roleChecked)setOwner(null);setData(null);setError((e as Error).message);}
  }
 },[]);
 useEffect(()=>{
  let alive=true;
  let channel:ReturnType<ReturnType<typeof browserDb>['channel']>|null=null;
  const client=browserDb();
  const connect=async()=>{
   const {data}=await client.auth.getSession();
   if(!alive)return;
   if(channel)void client.removeChannel(channel);
   channel=null;setConnected(false);
   if(data.session&&!data.session.user.is_anonymous){
    channel=client.channel('planet:'+planet+':'+data.session.user.id);
    for(const table of ['ng_planet_events','ng_planet_visits','ng_planet_photos','ng_planet_awards','ng_planet_notifications','ng_planet_profiles']){
     channel.on('postgres_changes',{event:'*',schema:'public',table,filter:'user_id=eq.'+data.session.user.id},()=>void refresh());
    }
    channel.subscribe(status=>{if(!alive)return;setConnected(status==='SUBSCRIBED');if(status==='SUBSCRIBED')void refresh();});
   }
   void refresh();
  };
  void connect();
  const {data:authListener}=client.auth.onAuthStateChange((_event,session)=>{
   if(alive){
    request.current++;
    if(account.current!==session?.user?.id){account.current=session?.user?.id??null;setOwner(null);setData(null);}
    setSignedIn(Boolean(session?.user&&!session.user.is_anonymous));
    if(!session||session.user.is_anonymous){setOwner(null);setData(null);setError('');}
   }
   setTimeout(()=>{if(alive)void connect();},0);
  });
  const changed=()=>{if(!document.hidden)void refresh();};
  window.addEventListener('nowgo-activity-change',changed);
  window.addEventListener('hot-customer-change',changed);
  window.addEventListener('focus',changed);
  document.addEventListener('visibilitychange',changed);
  const interval=setInterval(changed,30000);
  return()=>{
   alive=false;request.current++;clearInterval(interval);authListener.subscription.unsubscribe();
   if(channel)void client.removeChannel(channel);
   window.removeEventListener('nowgo-activity-change',changed);
   window.removeEventListener('hot-customer-change',changed);
   window.removeEventListener('focus',changed);
   document.removeEventListener('visibilitychange',changed);
  };
 },[planet,refresh]);
 return {data,error,signedIn,owner,connected,refresh};
}
