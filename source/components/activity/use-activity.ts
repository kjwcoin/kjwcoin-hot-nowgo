'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client';
import {browserDb} from '@/lib/supabase-browser';
import type {ActivitySnapshot,Planet} from '@/lib/activity/model';
import type {Session} from '@supabase/supabase-js';

export function useActivity(planet:Planet,includeOwners=false){
 const [data,setData]=useState<ActivitySnapshot|null>(null);
 const [error,setError]=useState('');
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 const [owner,setOwner]=useState<boolean|null>(null);
 const [connected,setConnected]=useState(false);
 const request=useRef(0),account=useRef<string|null>(null);
 const pending=useRef<Promise<void>|null>(null);
 const refresh=useCallback(async(session?:Session|null)=>{
  if(pending.current)return pending.current;
  const run=++request.current;
  const load=(async()=>{
  let roleChecked=false;
  try{
   const auth=session===undefined?(await browserDb().auth.getSession()).data:{session};
   if(run!==request.current)return;
   if(!auth.session||auth.session.user.is_anonymous){account.current=null;setSignedIn(false);setOwner(null);setData(null);setError('');return;}
   if(account.current!==auth.session.user.id){account.current=auth.session.user.id;setOwner(null);setData(null);}
   setSignedIn(true);
   if(includeOwners){roleChecked=true;setOwner(false);const snapshot=await api<ActivitySnapshot>('/api/activity/snapshot');if(run!==request.current)return;setData(snapshot);setError('');return;}
   const role=await api<{existingOwner:boolean}>('/api/customer/login-target');
   if(run!==request.current)return;
   if(typeof role.existingOwner!=='boolean')throw new Error('계정을 확인하지 못했어요.');
   roleChecked=true;setOwner(role.existingOwner);
   if(role.existingOwner&&!includeOwners){setData(null);setError('');return;}
   const activity=await api<ActivitySnapshot>('/api/activity/snapshot');
   if(run!==request.current)return;
   setData(activity);setError('');
  }catch(e){if(run===request.current){if(!roleChecked)setOwner(null);setError((e as Error).message);}}
 })();
  pending.current=load;
  try{await load;}finally{if(pending.current===load)pending.current=null;}
 },[includeOwners]);
 useEffect(()=>{
  let alive=true,channelUser:string|null=null;
  let changeTimer:ReturnType<typeof setTimeout>|undefined;
  let channel:ReturnType<ReturnType<typeof browserDb>['channel']>|null=null;
  const client=browserDb();
  const connect=async(session?:Session|null)=>{
   const data=session===undefined?(await client.auth.getSession()).data:{session};
   if(!alive)return;
   const userId=data.session&&!data.session.user.is_anonymous?data.session.user.id:null;
   if(userId===channelUser&&channel){void refresh(data.session);return;}
   if(channel)void client.removeChannel(channel);
   channel=null;channelUser=userId;setConnected(false);
   if(data.session&&!data.session.user.is_anonymous){channel=client.channel('planet:'+planet+':'+data.session.user.id);for(const table of ['ng_planet_events','ng_planet_visits','ng_planet_photos','ng_planet_awards','ng_planet_notifications','ng_planet_profiles'])channel.on('postgres_changes',{event:'*',schema:'public',table,filter:'user_id=eq.'+data.session.user.id},changed);channel.subscribe(status=>{if(!alive)return;setConnected(status==='SUBSCRIBED');});}
   void refresh(data.session);
  };
  void connect();
  const {data:authListener}=client.auth.onAuthStateChange((event,session)=>{
   if(!alive)return;
   const userId=session&&!session.user.is_anonymous?session.user.id:null;
   if(account.current!==userId){request.current++;pending.current=null;account.current=userId;setOwner(null);setData(null);setError('');}
   setSignedIn(Boolean(userId));
   if(!userId){setOwner(null);setData(null);setError('');}
   // Keep Supabase calls outside the auth callback lock, and preserve connections on token refresh.
   if(['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))setTimeout(()=>{if(alive)void connect(session);},0);
  });
  function changed(){
   if(document.hidden||!alive)return;
   clearTimeout(changeTimer);
   changeTimer=setTimeout(()=>{
    const current=pending.current;
    if(current)void current.then(()=>{if(alive)void refresh();});
    else void refresh();
   },80);
  }
  window.addEventListener('nowgo-activity-change',changed);window.addEventListener('hot-customer-change',changed);window.addEventListener('focus',changed);document.addEventListener('visibilitychange',changed);
  const interval=setInterval(changed,30000);
  return()=>{alive=false;request.current++;pending.current=null;clearTimeout(changeTimer);clearInterval(interval);authListener.subscription.unsubscribe();if(channel)void client.removeChannel(channel);window.removeEventListener('nowgo-activity-change',changed);window.removeEventListener('hot-customer-change',changed);window.removeEventListener('focus',changed);document.removeEventListener('visibilitychange',changed);};
 },[planet,refresh]);
 return {data,error,signedIn,owner,connected,refresh};
}
