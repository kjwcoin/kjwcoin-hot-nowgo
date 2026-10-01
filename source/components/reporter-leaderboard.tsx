'use client';
import {useEffect,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import type {SiteVariant} from '@/lib/site-config';

type Row={rank:number;public_id:string;nickname:string;report_count:number};

export default function ReporterLeaderboard({variant}:{variant:SiteVariant}){
 const [rows,setRows]=useState<Row[]>([]);
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  let alive=true;
  const load=async()=>{
   const {data,error}=await browserDb().rpc('ng_taste_reporter_leaderboard',{p_planet:variant});
   if(!alive)return;
   if(error){setRows([]);return}
   setRows((data??[]) as Row[]);
  };
  void load();
  const timer=window.setInterval(()=>void load(),60000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[variant]);
 return <div className="reporter-ranking">
  <button type="button" className="reporter-ranking__toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
   제보 랭킹 <strong>TOP 10</strong>
  </button>
  {open&&<div className="reporter-ranking__panel" role="region" aria-label={variant.toUpperCase()+' 제보 랭킹 TOP 10'}>
   <div className="reporter-ranking__head"><b>제보 랭킹 TOP 10</b><small>{variant.toUpperCase()}</small></div>
   {rows.length?<ol>{rows.map(row=><li key={row.public_id}>
    <span className="reporter-ranking__rank">{row.rank}</span>
    <span className="reporter-ranking__identity"><b>{row.nickname}</b><small>{row.public_id}</small></span>
    <span className="reporter-ranking__count">{row.report_count.toLocaleString('ko-KR')}건</span>
   </li>)}</ol>:<p className="reporter-ranking__empty">아직 집계된 공개 제보가 없습니다.</p>}
  </div>}
 </div>;
}
