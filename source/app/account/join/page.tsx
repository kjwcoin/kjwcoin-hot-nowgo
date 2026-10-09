'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import FlavorHeader from '@/components/flavor-header';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {returnPath} from '@/lib/integration-policy';
import {siteConfig,variantForHost} from '@/lib/site-config';

import OAuthButtons from '@/components/oauth-buttons';

export default function Join(){
 const variant=useSyncExternalStore(()=>()=>{},()=>variantForHost(location.host),()=> 'hot' as const),theme=siteConfig(variant);
 const search=useSyncExternalStore(()=>()=>{},()=>location.search,()=>''),params=new URLSearchParams(search),returnTo=returnPath(params.get('returnTo')),accountType=params.get('type')==='owner'?'owner':params.get('type')==='user'?'user':null;
 const [signedIn,setSignedIn]=useState(false),[authChecked,setAuthChecked]=useState(false),[essential,setEssential]=useState(false),[marketing,setMarketing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{queueMicrotask(()=>{try{void browserDb().auth.getUser().then(async({data})=>{
 if(data?.user&&!data.user.is_anonymous){
  const membership=await api<{existingOwner:boolean}>('/api/customer/login-target');
  if(membership.existingOwner){location.replace(returnTo);return}
 }
 setSignedIn(!!data?.user&&!data.user.is_anonymous);setAuthChecked(true)
}).catch(()=>setAuthChecked(true))}catch{setAuthChecked(true)}})},[]);
 async function finish(){
  if(!essential){setError('필수 가입 안내를 확인해 주세요.');return}
  setBusy(true);setError('');
  try{
   if(!accountType){setBusy(false);setError('유저 또는 점주를 선택해 주세요.');return}
   await api('/api/customer/consents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({essential:true,marketingEmail:marketing,version:theme.consent})});
   const {error:profileError}=await browserDb().auth.updateUser({data:{nowgo_account_type:accountType}});if(profileError)throw profileError;
   window.dispatchEvent(new Event('hot-customer-change'));
   location.assign(accountType==='owner'?(returnTo.startsWith('/owner')?returnTo:'/owner/signup'):'https://www.nowgo.space/flavors');
  }catch(e){setBusy(false);setError((e as Error).message)}
 }
 return <><FlavorHeader/><main className="terms-page join-page"><div className="eyebrow">{theme.name} · NOWGO ACCOUNT</div><h1>{accountType?`${accountType==='owner'?'점주':'유저'}로 시작하기`:'통합회원가입/로그인'}</h1><p>{accountType?`${theme.name}에서 사용할 ${accountType==='owner'?'점주':'유저'} 계정을 카카오 또는 구글로 연결해 주세요.`:'유저 또는 점주를 먼저 선택해 주세요.'}</p>
  {!accountType?<section className="account-type-grid" aria-label="가입 유형 선택"><Link className="account-type-card" href={'/account/join?type=user&returnTo='+encodeURIComponent(returnTo)}><strong>유저</strong><span>취향에 맞는 메뉴를 찾고 내 단골집의 영업현황을 확인해요.</span><em>유저로 시작하기 →</em></Link><Link className="account-type-card" href="/owner/signup"><strong>점주</strong><span>내 매장을 등록하고 영업현황과 단골을 관리해요.</span><em>점주로 시작하기 →</em></Link></section>:<section className="join-card">{!authChecked?<p role="status">계정을 확인하고 있어요.</p>:signedIn?<><h2>{theme.name} 이용 동의 안내</h2><p>{theme.name}은 회원 ID, 선택한 가입 유형, 저장·제보 이력을 제보 운영 및 문의에 사용합니다. 공식 점주 권한은 매장 소유권 확인 후 별도로 적용됩니다.</p>
  <label className="consent"><input type="checkbox" checked={essential} onChange={e=>setEssential(e.target.checked)}/><span>[필수] <a href="/terms" target="_blank" rel="noreferrer">{theme.name} 이용·개인정보 안내</a> 및 <a href="https://www.nowgo.space/legal/privacy" target="_blank" rel="noreferrer">NOWGO 개인정보 처리방침</a>을 확인하고 가입에 동의합니다.</span></label>
  <label className="consent"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/><span>[선택] 이벤트 소식을 이메일로 받겠습니다. 동의하지 않아도 모든 기능을 이용할 수 있습니다.</span></label>
  <button className="submit-button" onClick={finish} disabled={busy}>{busy?'연결하는 중':accountType==='owner'?'점주 가입정보 입력하기 ↗':'유저로 시작하기 ↗'}</button></>:<><h2>{accountType==='owner'?'점주':'유저'} 계정으로 로그인</h2><p>카카오 또는 구글 계정을 선택해 주세요.</p><OAuthButtons flavor={variant} returnTo={returnTo} accountType={accountType}/></>}
  {error&&<p className="customer-error" role="alert">{error}</p>}<Link className="account-type-back" href={'/account/join?returnTo='+encodeURIComponent(returnTo)}>← 유저·점주 다시 선택</Link></section>}
  <p className="small-note">공식 점주 표시는 NOWGO 매장 관리 권한 확인을 받은 회원에게만 적용됩니다.</p>
 </main></>
}
