'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
import type {RegionSummary} from '@/lib/map-regions';
export function useMapRegions(){
 const [summary,setSummary]=useState<RegionSummary|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let controller:AbortController|undefined;
  const refresh=()=>{
   controller?.abort();const current=new AbortController();controller=current;
   void api<RegionSummary>('/api/map-regions',{signal:current.signal}).then(data=>{
    if(!current.signal.aborted){setSummary(data);setError('')}
   }).catch(()=>{if(!current.signal.aborted){setSummary(null);setError('지역별 매장 수를 불러오지 못했어요.')}});
  };
  refresh();
  const visible=()=>{if(document.visibilityState==='visible')refresh()};
  const timer=setInterval(visible,60_000);
  window.addEventListener('focus',refresh);window.addEventListener('nowgo:catalog-refresh',refresh);
  window.addEventListener('nowgo-activity-change',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{controller?.abort();clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('nowgo:catalog-refresh',refresh);window.removeEventListener('nowgo-activity-change',refresh);document.removeEventListener('visibilitychange',visible)};
 },[]);
 return {summary,error};
}

