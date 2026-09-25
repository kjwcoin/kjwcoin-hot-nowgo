'use client';
import {useEffect,useState} from 'react';
import {Input} from '@/components/ui/input';

export type StoreChoice={id:string;name:string;address:string;slug:string};

export default function StorePicker({selected,onSelect,manual,onManual}:{
 selected:StoreChoice|null;
 onSelect:(store:StoreChoice|null)=>void;
 manual:boolean;
 onManual:(manual:boolean)=>void;
}){
 const [query,setQuery]=useState('');
 const [stores,setStores]=useState<StoreChoice[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(selected||manual||query.trim().length<2){setStores([]);setLoading(false);setError('');return}
  const controller=new AbortController();
  const timeout=setTimeout(()=>{
   setLoading(true);
   fetch(`/api/stores?q=${encodeURIComponent(query.trim())}`,{signal:controller.signal})
    .then(async response=>{if(!response.ok)throw new Error('search failed');return response.json() as Promise<{stores:StoreChoice[]}>})
    .then(data=>{setStores(data.stores);setError('')})
    .catch(()=>{if(!controller.signal.aborted)setError('검색을 완료하지 못했어요. 다시 시도해 주세요.')})
    .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  },250);
  return()=>{clearTimeout(timeout);controller.abort()};
 },[query,selected,manual]);
 return <div className="store-picker">
  <strong>매장 찾기</strong>
  {selected?<div className="store-picker__selected"><span><b>{selected.name}</b><small>{selected.address}</small><a href={`https://www.nowgo.space/p/${encodeURIComponent(selected.slug)}`} target="_blank" rel="noreferrer">미니홈피 확인 ↗</a></span><button type="button" onClick={()=>onSelect(null)}>다른 매장 찾기</button></div>
   :manual?<p>검색 목록에 없다면 매장 이름과 주소를 직접 적어주세요. 확인 후 미니홈피와 연결합니다. <button type="button" onClick={()=>onManual(false)}>매장 다시 찾기</button></p>
   :<><Input aria-label="제보할 매장 찾기" placeholder="상호명을 검색해 주세요" value={query} onChange={e=>setQuery(e.target.value)} maxLength={60} autoComplete="off"/>
     {loading&&<p role="status">매장을 찾고 있어요.</p>}
     {error&&<p role="alert">{error}</p>}
     {!loading&&!error&&query.trim().length>=2&&<div className="store-picker__results" role="list" aria-label="매장 검색 결과">
      {stores.map(store=><button type="button" role="listitem" key={store.id} onClick={()=>onSelect(store)}><b>{store.name}</b><small>{store.address}</small></button>)}
      {!stores.length&&<p>등록된 매장을 찾지 못했어요.</p>}
     </div>}
     <button type="button" className="store-picker__manual" onClick={()=>onManual(true)}>찾는 매장이 없나요? 직접 등록하기 ↗</button></>}
 </div>;
}
