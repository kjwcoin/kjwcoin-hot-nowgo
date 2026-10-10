'use client';
import {useEffect,useState} from 'react';
import OAuthButtons from './oauth-buttons';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {isAppLoginChannel} from '@/lib/app-embed';
import type {SiteVariant} from '@/lib/site-config';
export default function AppReportLogin({variant,channel,role,provider}:{variant:SiteVariant;channel:string;role:'customer'|'owner';provider?:'google'|'kakao'|'apple'}){
 const [state,setState]=useState<'loading'|'guest'|'done'|'error'>('loading'),[message,setMessage]=useState('');
 const returnTo='/app/report-login?role='+role+'&channel='+encodeURIComponent(channel);
 useEffect(()=>{let active=true;async function connect(){try{
  if(!isAppLoginChannel(channel))throw Error('연결 요청을 다시 열어 주세요.');
  const db=browserDb(),{data}=await db.auth.getSession();if(!data.session){if(active)setState('guest');return}
  const profile=await api<{customer:unknown;consentRequired:boolean}>('/api/customer/me');if(!active)return;
  if(!profile.customer||profile.consentRequired){location.replace('/account/join?type='+(role==='owner'?'owner':'user')+'&returnTo='+encodeURIComponent(returnTo));return}
  if(!window.opener)throw Error('앱으로 돌아가 계정 연결 버튼을 다시 눌러 주세요.');
  window.opener.postMessage({type:'nowgo:form-session',channel,session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}},location.origin);
  setState('done');setMessage('앱의 제보 폼에 계정을 연결했어요. 이 창을 닫고 제보를 이어가세요.');
 }catch(error){if(active){setState('error');setMessage(error instanceof Error?error.message:'계정 연결을 다시 확인해 주세요.')}}}void connect();return()=>{active=false}},[channel,role,returnTo]);
 return <main className="terms-page join-page" style={{maxWidth:540,padding:'32px 20px'}}><h1>NOWGO 계정 연결</h1>{state==='guest'?<><p>앱에서 사용할 계정을 선택해 주세요.</p><OAuthButtons flavor={variant} returnTo={returnTo} accountType={role==='owner'?'owner':'user'} initialProvider={provider} includeApple/></>:<p role="status">{state==='loading'?'로그인 정보를 확인하고 있어요.':message}</p>}{state==='error'&&<button type="button" onClick={()=>location.reload()}>다시 확인하기</button>}</main>;
}
