'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {api} from '@/lib/client';
type Status={status:string;pending:boolean;expiresAt:string|null;cancelAtPeriodEnd:boolean;isTest:boolean;nextPaymentAt:string|null;checkedAt:number};
const consentVersion='2026-10-06-steppay-month-v1';
export default function MapSubscriptionSettings({ownerVerified,required=false,onActivated}:{ownerVerified:boolean;required?:boolean;onActivated?:()=>void}){
 const subscriptionDialog=useRef<HTMLDialogElement>(null);
 const [status,setStatus]=useState<Status|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const load=useCallback(async()=>{if(!ownerVerified)return;const s=await api<Status>('/api/owner/subscription');setStatus({...s,checkedAt:Date.now()})},[ownerVerified]);
 useEffect(()=>{if(!ownerVerified){subscriptionDialog.current?.close();return}let active=true;api<Status>('/api/owner/subscription').then(s=>{if(active)setStatus({...s,checkedAt:Date.now()})}).catch(e=>{if(active)setMessage(e.message)});return()=>{active=false}},[ownerVerified]);
 async function act(action:'start'|'refresh'|'cancel'){
  if(!ownerVerified)return;
  setBusy(true);setMessage('');try{
   const result=await api<{checkoutUrl?:string}>('/api/owner/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(action==='start'?{consentAccepted:consent,consentVersion}:{})})});
   if(result.checkoutUrl){const u=new URL(result.checkoutUrl);if(u.protocol!=='https:')throw new Error('결제 링크를 확인해 주세요.');window.location.assign(u.toString());return}
   await load();setMessage(action==='cancel'?'다음 회차 자동결제를 해지했습니다.':'구독 상태를 확인했습니다.');
  }catch(e){setMessage(e instanceof Error?e.message:'구독 상태를 확인하지 못했어요.')}finally{setBusy(false)}
 }
 const active=status?.status==='active'&&!status.isTest&&!!status.expiresAt&&Date.parse(status.expiresAt)>status.checkedAt;
 useEffect(()=>{
  const dialog=subscriptionDialog.current;
  if(!ownerVerified||active){dialog?.close();if(active)onActivated?.();return}
  if(required&&!dialog?.open)dialog?.showModal();
 },[ownerVerified,required,active,onActivated]);
 useEffect(()=>{if(!ownerVerified||!required||active)return;const check=()=>{void load().catch(e=>setMessage(e.message))};window.addEventListener('focus',check);const timer=setInterval(check,15000);return()=>{window.removeEventListener('focus',check);clearInterval(timer)}},[ownerVerified,required,active,load]);
 if(!ownerVerified)return <div aria-label="점주 구독 로그인 안내"><p>점주 통합계정 로그인과 매장 소유권 확인 후 구독할 수 있습니다.</p><a href="/account/join?type=owner&returnTo=%2Fowner">점주 통합계정 로그인</a></div>;
 return <div aria-label="주식회사 나우고 월 정기결제">
  {status?.isTest&&<p>테스트 결제 · 실제 매장관리 권한은 열리지 않습니다.</p>}
  {active?<><p>이용 기간 종료: {new Date(status!.expiresAt!).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</p>{status!.nextPaymentAt&&!status!.cancelAtPeriodEnd?<p>다음 결제일: {new Date(status!.nextPaymentAt!).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</p>:null}{status!.cancelAtPeriodEnd?<p>자동갱신 해지 완료</p>:<button disabled={busy} onClick={()=>act('cancel')}>다음 회차 자동결제 해지</button>}</>:<button type="button" disabled={busy} onClick={()=>subscriptionDialog.current?.showModal()}>구독 월 1,900원</button>}
  <dialog ref={subscriptionDialog} onCancel={event=>{if(required)event.preventDefault()}} onClose={()=>{if(required&&ownerVerified&&!active)subscriptionDialog.current?.showModal()}} aria-modal="true" aria-labelledby="map-subscription-dialog-title" style={{maxWidth:'min(480px, calc(100vw - 32px))',border:'1px solid #d1d5db',borderRadius:16,padding:24,position:'fixed',top:'50%',left:'50%',transform:'translate(-50%, -50%)',margin:0,maxHeight:'calc(100vh - 32px)',overflowY:'auto'}}>
   <h2 id="map-subscription-dialog-title">내 매장관리 구독</h2>
   <p>월 1,900원 · 부가세 포함</p>
   {required&&<p>구독 결제 확인 전에는 매장 자료를 입력하거나 저장할 수 없습니다.</p>}
   <label><input type="checkbox" style={{width:'auto',height:'auto',marginRight:8}} checked={consent} onChange={e=>setConsent(e.target.checked)}/>HOT·SWEET·RICH 내 매장관리 월 1,900원(부가세 포함)을 주식회사 나우고와 결제하고 이후 매월 자동 결제하는 데 동의합니다. 첫 결제는 신청 시 진행되며 다음 결제일은 구독설정에 표시됩니다. 언제든 다음 회차 자동갱신을 해지할 수 있고 결제된 기간 종료일까지 이용할 수 있습니다. 청약철회·환불은 이용약관과 관계 법령에 따릅니다. 나우고 스페이스 구독과 별도이며 기존 계약을 자동 전환하지 않습니다.</label>
   <p><a href="/terms" target="_blank" rel="noreferrer">이용약관 보기</a></p>
   <button type="button" disabled={busy||!consent} onClick={()=>act('start')}>{busy?'처리 중…':'동의하고 결제하기'}</button>
   {!required&&<button type="button" disabled={busy} onClick={()=>subscriptionDialog.current?.close()}>닫기</button>}
   {required&&<><button type="button" disabled={busy} onClick={()=>act('refresh')}>결제 완료 후 다시 확인</button><p><Link href="/">지도로 돌아가기</Link></p></>}
   {message&&<p role="status">{message}</p>}
  </dialog>
  <button disabled={busy} onClick={()=>status?act('refresh'):load().catch(e=>setMessage(e.message))}>구독 상태 확인</button>{message&&<p role="status">{message}</p>}
 </div>;
}
