'use client';
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {readReportGrowth,reportGrowth,type ReportReceipt} from '@/lib/report-growth';
import type {ActivitySnapshot} from '@/lib/activity/model';
import type {SiteVariant} from '@/lib/site-config';
import styles from './report-completion.module.css';

export default function ReportCompletion({variant,receipt,onClose}:{variant:SiteVariant;receipt:ReportReceipt;onClose:()=>void}){
 const [snapshot,setSnapshot]=useState<ActivitySnapshot|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  void readReportGrowth(variant,controller.signal).then(data=>{if(!controller.signal.aborted)setSnapshot(data)}).catch(()=>{if(!controller.signal.aborted)setFailed(true)});
  return()=>controller.abort();
 },[variant,receipt.id,retry]);
 const g=snapshot?reportGrowth(snapshot.xp,receipt.previousXp):null;
 const col=g?[0,1,2,3,3,4][Math.min(5,g.character)]:0,row=variant==='hot'?0:variant==='sweet'?1:2;
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className={styles.popup} data-flavor={variant}>
  <div className={styles.check} aria-hidden="true">✓</div>
  <DialogTitle className={styles.title}>제보가 성공적으로 접수됐어요!</DialogTitle>
  <DialogDescription>알려주신 한 접시가 지도에 반영됐어요.</DialogDescription>
  {snapshot&&g?<section className={styles.growth} aria-label="제보 후 나의 성장">
   {g.levelUp&&<strong className={styles.levelUp} role="status">레벨 업! Lv. {g.previousLevel} → Lv. {g.level}</strong>}
   <div className={styles.character} role="img" aria-label={g.rank.name+' 캐릭터'} style={{backgroundPosition:`${col*25}% ${row*50}%`}}/>
   <h2>{snapshot.profile.character_name||g.rank.name}</h2>
   <strong>Lv. {g.level} · {g.rank.name}</strong>
   <p className={styles.exp}>{snapshot.xp.toLocaleString('ko-KR')} EXP{g.gainedXp!==null&&g.gainedXp>0&&<span>+{g.gainedXp.toLocaleString('ko-KR')} EXP</span>}</p>
   <progress max={g.next-g.min} value={snapshot.xp-g.min} aria-label="다음 레벨까지 경험치"/>
   <small>다음 레벨까지 {g.remainingXp.toLocaleString('ko-KR')} EXP</small>
  </section>:failed?<div role="status"><p>제보 접수는 완료됐어요. 성장 기록을 다시 불러와 주세요.</p><button type="button" className={styles.retry} onClick={()=>{setFailed(false);setRetry(n=>n+1)}}>레벨·EXP 다시 불러오기</button></div>:<p role="status">캐릭터와 EXP를 불러오는 중이에요…</p>}
  <button type="button" className={styles.confirm} onClick={onClose}>확인</button>
  <small className={styles.receipt}>접수번호 {receipt.id}</small>
 </DialogContent></Dialog>;
}
