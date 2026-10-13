'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {isSourceOnlyFeed,parseSourcedStoreFeed,type PublicSourcedStoreFeed} from '@/lib/sourced-store';
import {CURRENT_SOURCE_FEED_CONTRACT,SOURCE_FEED_CONTRACT_HEADER} from '@/lib/source-feed-contract';
import type {SiteVariant} from '@/lib/site-config';
export type SourceFeedState={status:'loading'|'error'|'ready';feed:PublicSourcedStoreFeed|null};
export function useSourcedStores(variant:SiteVariant,previewFeed?:PublicSourcedStoreFeed,initialFeed?:PublicSourcedStoreFeed){
 const scope=(typeof window==='undefined'?'':window.location?.origin||'')+'|'+variant+'|'+CURRENT_SOURCE_FEED_CONTRACT;
 // An SSR seed supplies first-paint facts only; failed refreshes still clear stale data.
 const [state,setState]=useState<SourceFeedState & {scope:string}>(()=>(previewFeed||initialFeed)?{status:'ready',feed:previewFeed||initialFeed!,scope}:{status:'loading',feed:null,scope});
 const snapshot=useRef<{scope:string;etag:string;feed:PublicSourcedStoreFeed}|null>(null);
 const request=useRef(0),controller=useRef<AbortController|null>(null);
 const refresh=useCallback(async()=>{
  if(previewFeed){setState({status:'ready',feed:previewFeed,scope});return}
  const sequence=++request.current;controller.current?.abort();
  if(snapshot.current?.scope!==scope)snapshot.current=null;
  if(variant!=='hot'){snapshot.current=null;setState({status:'ready',feed:{stores:[],complete:true,asOf:new Date().toISOString()},scope});return}
  const abort=new AbortController();controller.current=abort;const timeout=setTimeout(()=>abort.abort(),10000);
  // Retain only immutable, unverified source-only facts while checking for updates.
  // Clearing them mid-request unmounts the selected panel every30s. Live ownership
  // never survives this boundary, and errors/removals still clear the old facts.
  setState(current=>({status:'loading',feed:current.scope===scope&&isSourceOnlyFeed(current.feed)?current.feed:null,scope}));
  const previous=snapshot.current;
  const contractHeaders={[SOURCE_FEED_CONTRACT_HEADER]:CURRENT_SOURCE_FEED_CONTRACT};
  const headers:Record<string,string>={...contractHeaders};
  if(previous)headers['If-None-Match']=previous.etag;
  try{
   const options={cache:'no-store' as const,credentials:'same-origin' as const,signal:abort.signal};
   let response=await fetch('/api/sourced-stores',{...options,headers});
   if(sequence!==request.current)return;
   if(response.status===304){
    if(previous&&snapshot.current===previous&&previous.feed.complete&&isSourceOnlyFeed(previous.feed)&&response.headers?.get('etag')===previous.etag&&response.headers?.get(SOURCE_FEED_CONTRACT_HEADER)===CURRENT_SOURCE_FEED_CONTRACT){
     // Same exact validated object keeps the selected panel stable on every poll.
     setState({status:'ready',feed:previous.feed,scope});return;
    }
    // A cold/restored client cannot use 304 without its exact validated snapshot.
    // Retry once without a validator, sharing this request's abort and deadline.
    snapshot.current=null;setState({status:'loading',feed:null,scope});
    response=await fetch('/api/sourced-stores',{...options,headers:contractHeaders});
    if(sequence!==request.current)return;
   }
   if(!response.ok||response.status===304)throw Error('source_unavailable');
   if(response.headers?.get(SOURCE_FEED_CONTRACT_HEADER)!==CURRENT_SOURCE_FEED_CONTRACT)throw Error('source_contract_mismatch');
   const feed=parseSourcedStoreFeed(await response.json());
   if(sequence!==request.current)return;
   const etag=response.headers?.get('etag');
   snapshot.current=feed.complete&&isSourceOnlyFeed(feed)&&etag&&/^(?:W\/)?"hot-source-v1-[a-f0-9]{64}"$/.test(etag)?{scope,etag,feed}:null;
   setState({status:'ready',feed,scope});
  }catch{if(sequence===request.current){snapshot.current=null;setState({status:'error',feed:null,scope})}}
  finally{clearTimeout(timeout)}
 },[variant,previewFeed,scope]);
 useEffect(()=>{
  if(previewFeed)return;
  const pending=request;const initial=setTimeout(()=>void refresh(),0);const visible=()=>{if(document.visibilityState==='visible')void refresh()};
  const interval=setInterval(visible,30000),channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nowgo-catalog'):null;
  if(channel)channel.onmessage=event=>{if(event.data?.brand===variant)void refresh()};
  window.addEventListener('focus',refresh);window.addEventListener('nowgo:catalog-refresh',refresh);window.addEventListener('nowgo-activity-change',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{pending.current++;controller.current?.abort();clearTimeout(initial);clearInterval(interval);channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('nowgo:catalog-refresh',refresh);window.removeEventListener('nowgo-activity-change',refresh);document.removeEventListener('visibilitychange',visible)};
 },[refresh,variant,previewFeed]);
 // A variant/origin switch must not display the preceding scope before its effect runs.
 return {...(state.scope===scope?state:{status:'loading' as const,feed:null}),refresh};
}
