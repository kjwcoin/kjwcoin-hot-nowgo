'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {parseSourcedStoreFeed,type PublicSourcedStoreFeed} from '@/lib/sourced-store';
import type {SiteVariant} from '@/lib/site-config';
export type SourceFeedState={status:'loading'|'error'|'ready';feed:PublicSourcedStoreFeed|null};
export function useSourcedStores(variant:SiteVariant,previewFeed?:PublicSourcedStoreFeed,initialFeed?:PublicSourcedStoreFeed){
 // An SSR seed supplies first-paint facts only; refresh still clears stale data.
 const [state,setState]=useState<SourceFeedState>((previewFeed||initialFeed)?{status:'ready',feed:previewFeed||initialFeed!}:{status:'loading',feed:null});
 const request=useRef(0),controller=useRef<AbortController|null>(null);
 const refresh=useCallback(async()=>{
  if(previewFeed){setState({status:'ready',feed:previewFeed});return}
  const sequence=++request.current;controller.current?.abort();
  if(variant!=='hot'){setState({status:'ready',feed:{stores:[],complete:true,asOf:new Date().toISOString()}});return}
  const abort=new AbortController();controller.current=abort;const timeout=setTimeout(()=>abort.abort(),10000);
  // Drop stale claims/pins when refresh fails rather than presenting old ownership.
  setState({status:'loading',feed:null});
  try{
   const response=await fetch('/api/sourced-stores',{cache:'no-store',signal:abort.signal});
   if(!response.ok)throw Error('source_unavailable');
   const feed=parseSourcedStoreFeed(await response.json());
   if(sequence===request.current)setState({status:'ready',feed});
  }catch{if(sequence===request.current)setState({status:'error',feed:null})}
  finally{clearTimeout(timeout)}
 },[variant,previewFeed]);
 useEffect(()=>{
  if(previewFeed)return;
  const pending=request;const initial=setTimeout(()=>void refresh(),0);const visible=()=>{if(document.visibilityState==='visible')void refresh()};
  const interval=setInterval(visible,30000),channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nowgo-catalog'):null;
  if(channel)channel.onmessage=event=>{if(event.data?.brand===variant)void refresh()};
  window.addEventListener('focus',refresh);window.addEventListener('nowgo:catalog-refresh',refresh);window.addEventListener('nowgo-activity-change',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{pending.current++;controller.current?.abort();clearTimeout(initial);clearInterval(interval);channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('nowgo:catalog-refresh',refresh);window.removeEventListener('nowgo-activity-change',refresh);document.removeEventListener('visibilitychange',visible)};
 },[refresh,variant,previewFeed]);
 return {...state,refresh};
}
