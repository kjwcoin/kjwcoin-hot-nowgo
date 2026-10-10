'use client';
import {useEffect,useRef,useState} from 'react';
import ReportAccess,{type useReportMembership} from './report-access';
import {browserDb} from '@/lib/supabase-browser';
import type {SiteVariant} from '@/lib/site-config';
export default function AppReportAccess({role,variant,membership,storeId,onStoreChange}:{role:'customer'|'owner';variant:SiteVariant;membership:ReturnType<typeof useReportMembership>;storeId:string;onStoreChange:(id:string)=>void}){
 const popup=useRef<Window|null>(null),channel=useRef('');
 const [message,setMessage]=useState(''),[connecting,setConnecting]=useState(false);
 const refresh=membership.refresh;
 useEffect(()=>{let active=true;const receive=async(event:MessageEvent)=>{
  if(event.origin!==location.origin||event.source!==popup.current||!popup.current)return;
  const data=event.data;if(data?.type!=='nowgo:form-session'||data.channel!==channel.current)return;
  const session=data.session;if(typeof session?.access_token!=='string'||typeof session?.refresh_token!=='string'||session.access_token.length>20000||session.refresh_token.length>20000)return;
  try{const {error}=await browserDb().auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});if(error)throw error;if(!active)return;popup.current?.close();popup.current=null;channel.current='';setConnecting(false);setMessage('계정이 연결됐어요.');await refresh();window.dispatchEvent(new Event('hot-customer-change'))}catch(error){if(active){setConnecting(false);setMessage(error instanceof Error?error.message:'로그인을 다시 확인해 주세요.')}}
 };window.addEventListener('message',receive);return()=>{active=false;window.removeEventListener('message',receive)}},[refresh]);
 useEffect(()=>{const receive=async(event:Event)=>{const bridge=(window as unknown as {webkit?:{messageHandlers?:{nowgo?:unknown}}}).webkit?.messageHandlers?.nowgo;if(!bridge)return;const session=(event as CustomEvent).detail;if(typeof session?.access_token!=='string'||typeof session?.refresh_token!=='string')return;const {error}=await browserDb().auth.setSession(session);if(!error){await refresh();window.dispatchEvent(new Event('hot-customer-change'))}};window.addEventListener('nowgo:native-session',receive);return()=>window.removeEventListener('nowgo:native-session',receive)},[refresh]);
 function connect(){const bridge=(window as unknown as {webkit?:{messageHandlers?:{nowgo?:{postMessage:(data:unknown)=>void}}}}).webkit?.messageHandlers?.nowgo;if(bridge){bridge.postMessage({type:'nowgo:sign-in',brand:variant});return}channel.current=crypto.randomUUID();const path='/app/report-login?role='+role+'&channel='+encodeURIComponent(channel.current);popup.current=window.open(path,'nowgo-report-login','popup,width=480,height=760');if(!popup.current){setMessage('새 창을 허용한 뒤 다시 눌러 주세요.');return}setConnecting(true);setMessage('로그인 창에서 계정을 연결해 주세요.')}
 if(membership.loading)return <p role="status">계정과 매장 권한을 확인하고 있어요.</p>;
 if(membership.customerReady)return <ReportAccess role={role} flavor={variant} membership={membership} storeId={storeId} onStoreChange={onStoreChange}/>;
 return <div className="app-report-access">
  {membership.consentRequired&&<a className="app-form-primary" href="/account/join?type=user&returnTo=%2Fapp%2Freport">이용 동의 완료하기</a>}
  <strong>내 계정으로 제보하기</strong>
  <p>통합회원 계정을 연결하면 작성한 제보를 제출할 수 있어요.</p>
  <button type="button" className="app-form-primary" onClick={connect}>{connecting?'로그인 창 다시 열기':'계정 연결하기'}</button>
  {message&&<p role="status">{message}</p>}{membership.error&&<p role="alert">{membership.error}<button type="button" className="text-link" onClick={()=>void refresh()}>다시 확인하기</button></p>}
 </div>;
}
