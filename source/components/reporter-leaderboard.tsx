'use client';
import {useEffect,useId,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {reporterRanks,stampChallengeRanks,type ReporterRank,type StampChallengeRank} from '@/lib/reporter-leaderboard';
import styles from './reporter-leaderboard.module.css';

type Variant='hot'|'sweet'|'rich';
type LoadState='loading'|'ready'|'error';
export default function ReporterLeaderboard({variant}:{variant:Variant}){
 const [rows,setRows]=useState<ReporterRank[]>([]);
 const [stampRows,setStampRows]=useState<StampChallengeRank[]>([]);
 const [open,setOpen]=useState(true);
 const [status,setStatus]=useState<LoadState>('loading');
 const [stampStatus,setStampStatus]=useState<LoadState>('loading');
 const [retry,setRetry]=useState(0);
 const panel=useId();
 useEffect(()=>{
  const controller=new AbortController();let pending=false;
  setRows([]);setStampRows([]);setStatus('loading');setStampStatus('loading');
  const load=async()=>{
   if(pending||document.hidden)return;pending=true;
   const db=browserDb();
   try{
    const {data,error}=await db.rpc('ng_taste_reporter_leaderboard',{p_planet:variant}).abortSignal(controller.signal);
    if(error)throw error;
    const next=reporterRanks(data);
    if(!controller.signal.aborted){setRows(next);setStatus('ready')}
   }catch{if(!controller.signal.aborted){setRows([]);setStatus('error')}}
   try{
    const {data,error}=await db.rpc('ng_hot_stamp_challenge_leaderboard').abortSignal(controller.signal);
    if(error)throw error;
    const next=stampChallengeRanks(data);
    if(!controller.signal.aborted){setStampRows(next);setStampStatus('ready')}
   }catch{if(!controller.signal.aborted){setStampRows([]);setStampStatus('error')}}
   finally{pending=false}
  };
  void load();
  const timer=window.setInterval(load,60000);
  window.addEventListener('focus',load);document.addEventListener('visibilitychange',load);
  return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('focus',load);document.removeEventListener('visibilitychange',load)};
 },[variant,retry]);
 return <div className={styles.wrap}>
  <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={panel} onClick={()=>setOpen(v=>!v)}>
   제보 순위 <strong>TOP 10</strong><span aria-hidden="true">{open?'⌃':'⌄'}</span>
  </button>
  {open&&<div id={panel} className={styles.panel}>
   <section aria-label={variant.toUpperCase()+' 제보 순위 TOP 10'}>
    <header className={styles.head}><b>제보 순위 <strong>TOP 10</strong></b><small>{variant.toUpperCase()}</small></header>
    <p className={styles.note}>공개 맛 제보 건수 기준 · 검증 EXP와 별도</p>
    {status==='loading'?<p className={styles.empty} role="status">실제 제보 순위를 불러오는 중이에요.</p>
     :status==='error'?<div className={styles.empty} role="alert"><p>제보 순위를 불러오지 못했어요.</p><button type="button" onClick={()=>setRetry(v=>v+1)}>다시 확인</button></div>
     :rows.length?<ol className={styles.list}>{rows.map(row=><li key={row.public_id}>
      <span className={styles.rank} aria-label={`${row.rank}위`}>{row.rank}</span>
      <span className={styles.identity}><b>{row.nickname}</b><small>아이디 {row.public_id}</small></span>
      <span className={styles.count}>{row.report_count.toLocaleString('ko-KR')}건</span>
     </li>)}</ol>:<p className={styles.empty} role="status">아직 집계된 공개 제보가 없어요. 첫 제보자가 되어 주세요!</p>}
    <footer className={styles.footer}><a href="/suggestion#report">제보하기 →</a><small>공개용 아이디 · 1분마다 갱신</small></footer>
   </section>
   <section className={styles.challenge} aria-label="HOT 도장깨기 TOP 10">
    <header className={styles.head}><b>도장깨기 <strong>TOP 10</strong></b><small>HOT</small></header>
    <p className={styles.note}>검증 완료된 HOT 매장 수 기준 · 같은 매장은 한 번만 집계</p>
    {stampStatus==='loading'?<p className={styles.empty} role="status">도장 기록을 불러오는 중이에요.</p>
     :stampStatus==='error'?<div className={styles.empty} role="alert"><p>도장깨기 순위를 불러오지 못했어요.</p><button type="button" onClick={()=>setRetry(v=>v+1)}>다시 확인</button></div>
     :stampRows.length?<ol className={styles.list}>{stampRows.map(row=><li key={row.public_id}>
      <span className={styles.rank} aria-label={`${row.rank}위`}>{row.rank}</span>
      <span className={styles.identity}><b>{row.nickname}</b><small>아이디 {row.public_id}</small></span>
      <span className={styles.count}>{row.stamp_count.toLocaleString('ko-KR')}곳</span>
     </li>)}</ol>:<p className={styles.empty} role="status">검증된 HOT 매장 도장이 아직 없어요. 첫 도전자가 되어 보세요!</p>}
    <footer className={styles.footer}><small>검증 완료된 HOT 매장별 1도장 · 1분마다 갱신</small></footer>
   </section>
  </div>}
 </div>;
}
