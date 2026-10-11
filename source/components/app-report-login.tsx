'use client';
import {useEffect,useState} from 'react';
import OAuthButtons from './oauth-buttons';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {APP_PARENT_ORIGIN,isAppLoginChannel} from '@/lib/app-embed';
import type {SiteVariant} from '@/lib/site-config';
export default function AppReportLogin({variant,channel,role,provider,entry=false,favoriteStoreId,character=false,app=false}:{variant:SiteVariant;channel:string;role:'customer'|'owner';provider?:'google'|'kakao'|'apple';entry?:boolean;favoriteStoreId?:string;character?:boolean;app?:boolean}){
 const [state,setState]=useState<'loading'|'guest'|'favorite'|'done'|'error'>('loading'),[message,setMessage]=useState('');
 const returnTo='/app/report-login?role='+role+'&channel='+encodeURIComponent(channel)+(app?'&mode=app':character?'&mode=character':entry?'&mode=entry':'')+(entry&&favoriteStoreId?'&favoriteStoreId='+encodeURIComponent(favoriteStoreId):'');
 useEffect(()=>{let active=true;async function connect(){try{
  if(!app&&!character&&!isAppLoginChannel(channel))throw Error('연결 요청을 다시 열어 주세요.');
  const db=browserDb(),{data}=await db.auth.getSession();if(!data.session){if(active)setState('guest');return}
  const profile=await api<{customer:unknown;consentRequired:boolean}>('/api/customer/me');if(!active)return;
  if(!profile.customer||profile.consentRequired){location.replace('/account/join?type='+(role==='owner'?'owner':'user')+'&returnTo='+encodeURIComponent(returnTo));return}
  if(app||character){location.replace('/app');return}
  if(entry&&favoriteStoreId){setState('favorite');setMessage('로그인했어요. 선택한 매장을 내 단골 목록에 저장할까요?');return}
  if(!window.opener)throw Error('앱으로 돌아가 계정 연결 버튼을 다시 눌러 주세요.');
  if(entry){window.opener.postMessage({type:'nowgo:entry-ready',brand:variant,channel},APP_PARENT_ORIGIN)}else{window.opener.postMessage({type:'nowgo:form-session',channel,session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}},location.origin)}
  setState('done');setMessage(entry?'로그인했어요. 이 창을 닫고 나우고 앱으로 돌아가세요.':'앱의 제보 폼에 계정을 연결했어요. 이 창을 닫고 제보를 이어가세요.');
 }catch(error){if(active){setState('error');setMessage(error instanceof Error?error.message:'계정 연결을 다시 확인해 주세요.')}}}void connect();return()=>{active=false}},[channel,role,returnTo,entry,variant,favoriteStoreId,character,app]);
 async function saveFavorite(){if(!entry||!favoriteStoreId||state!=='favorite')return;setState('loading');try{const result=await api<{registered:boolean}>('/api/customer/favorite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeId:favoriteStoreId,active:true})});if(!result.registered)throw Error('저장 결과를 확인하지 못했어요.');window.opener?.postMessage({type:'nowgo:entry-ready',brand:variant,channel,favoriteSaved:true,storeId:favoriteStoreId},APP_PARENT_ORIGIN);setState('done');setMessage('내 단골 목록에 저장했어요. 이 창을 닫고 앱으로 돌아가세요.')}catch(error){setState('favorite');setMessage(error instanceof Error?error.message:'단골 저장을 다시 시도해 주세요.')}}
 return <main className="terms-page join-page" style={{maxWidth:540,padding:'32px 20px'}}><h1>NOWGO 계정 연결</h1>{state==='guest'?<><p>앱에서 사용할 계정을 선택해 주세요.</p><OAuthButtons flavor={variant} returnTo={returnTo} accountType={role==='owner'?'owner':'user'} initialProvider={provider} includeApple/></>:<p role="status">{state==='loading'?'로그인 정보를 확인하고 있어요.':message}</p>}{state==='favorite'&&<button type="button" className="submit-button" onClick={()=>void saveFavorite()}>이 매장 단골등록</button>}{state==='error'&&<button type="button" onClick={()=>location.reload()}>다시 확인하기</button>}</main>;
}
