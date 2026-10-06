'use client';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore,type CSSProperties} from 'react';
import Link from 'next/link';
import {api} from '@/lib/client';
import styles from './map-subscription-settings.module.css';
import {siteConfig,variantForHost} from '@/lib/site-config';
type Status={ready:boolean;status:string;pending:boolean;expiresAt:string|null;cancelAtPeriodEnd:boolean;isTest:boolean;nextPaymentAt:string|null;checkedAt:number};
const consentVersion='2026-10-06-fastspring-krw-v1';
export default function MapSubscriptionSettings({ownerVerified,required=false,onActivated}:{ownerVerified:boolean;required?:boolean;onActivated?:()=>void}){
 const variant=useSyncExternalStore(()=>()=>{},()=>variantForHost(location.host),()=> 'hot' as const);
 const theme=siteConfig(variant);
 const palette={hot:{background:'#fff4f1',soft:'#ffe1d9',muted:'#805046',line:'#eac5bb'},rich:{background:'#f7f0e5',soft:'#eadcc6',muted:'#75634c',line:'#d9c7aa'},sweet:{background:'#edf9f5',soft:'#d3eee3',muted:'#426f60',line:'#b9dfd0'}}[variant];
 const cardStyle={'--subscription-accent':theme.accent,'--subscription-bg':palette.background,'--subscription-soft':palette.soft,'--subscription-muted':palette.muted,'--subscription-line':palette.line} as CSSProperties;
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
  <dialog ref={subscriptionDialog} onCancel={event=>{if(required)event.preventDefault()}} onClose={()=>{if(required&&ownerVerified&&!active)subscriptionDialog.current?.showModal()}} aria-modal="true" aria-labelledby="map-subscription-dialog-title" className={styles.dialog} style={cardStyle}>
   <header className={styles.header}><h2 id="map-subscription-dialog-title">{theme.name} 내 매장관리</h2><span>단일 구독</span></header>
   <div className={styles.layout}><section className={styles.overview}>
   <p className={styles.price}><strong>1,900</strong>원 / 월</p><p className={styles.vat}>부가세 포함</p>
   <ul className={styles.features}>{['실시간 영업 상태·혼잡도 관리','대표메뉴·가격·사진 관리','예약 접수·예약 내역 관리','웨이팅 접수·대기 팀 관리','선택한 지도에 매장 운영 정보 반영'].map(feature=><li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
   </section><section className={styles.payment} aria-label="구독 신청"><h3>구독 시작하기</h3>{status?.isTest&&<p role="status">테스트 결제 모드 · 실제 청구와 매장관리 권한 부여는 진행되지 않습니다.</p>}{status&&!status.ready&&<p role="status">결제 연결을 준비 중입니다. 아직 결제가 시작되지 않았습니다.</p>}<p>로그인한 점주 계정으로 결제합니다.</p>
   <label className={styles.consent}><input type="checkbox" className={styles.checkbox} checked={consent} onChange={e=>setConsent(e.target.checked)}/>월 1,900원(부가세 포함)을 FastSpring 결제창에서 결제하고 매월 자동 결제하는 데 동의합니다.</label>
   <details className={styles.details}><summary>정기결제·해지·환불 안내</summary><p>첫 결제는 신청 시 진행되며 다음 결제일은 구독설정에 표시됩니다. 언제든 다음 회차 자동갱신을 해지할 수 있고 결제된 기간 종료일까지 이용할 수 있습니다. 청약철회·환불은 이용약관과 관계 법령에 따릅니다. 나우고 스페이스 구독과 별도이며 기존 계약을 자동 전환하지 않습니다.</p></details>
   <p><a href="/terms" target="_blank" rel="noreferrer">이용약관 보기</a></p>
   <button type="button" className={styles.subscribe} disabled={busy||!consent||!status?.ready} onClick={()=>act('start')}>{busy?'처리 중…' :'동의하고 구독하기'}</button>
   {!consent&&<p className={styles.hint}>정기결제 동의를 체크하면 구독할 수 있어요.</p>}
   {!required&&<button className={styles.secondary} type="button" disabled={busy} onClick={()=>subscriptionDialog.current?.close()}>닫기</button>}
   {required&&<><button className={styles.secondary} type="button" disabled={busy} onClick={()=>act('refresh')}>결제 완료 후 다시 확인</button><p><Link href="/">지도로 돌아가기</Link></p></>}
   <p>회원탈퇴 시 HOT·RICH·SWEET의 모든 연결 매장과 나우고 스페이스 월 구독까지 함께 종료됩니다. <a href="https://nowgo.space/account/withdraw">회원탈퇴 · 전체 서비스 종료</a></p>
   <p className={styles.footnote}>월 구독 1,900원 · 부가세 포함 · 결제 확인 후 내 매장관리 이용</p>
   {message&&<p role="status">{message}</p>}
   </section></div>
  </dialog>
  <p><a href="https://nowgo.space/owner/settings">설정 및 구독</a> · <a href="https://nowgo.space/account/withdraw">회원탈퇴 · 전체 서비스 종료</a></p>
  <button disabled={busy} onClick={()=>status?act('refresh'):load().catch(e=>setMessage(e.message))}>구독 상태 확인</button>{message&&<p role="status">{message}</p>}
 </div>;
}

