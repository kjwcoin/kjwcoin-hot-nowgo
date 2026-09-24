'use client';
import {useEffect,useState} from 'react';
import Brand from '@/components/brand';
import {browserDb} from '@/lib/supabase-browser';
import {api} from '@/lib/client';
import {returnPath} from '@/lib/integration-policy';

const VERSION='2026-09-24-hot-v1';
export default function Join(){
 const [returnTo,setReturnTo]=useState('/'),[signedIn,setSignedIn]=useState(false),[essential,setEssential]=useState(false),[marketing,setMarketing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setReturnTo(returnPath(new URLSearchParams(location.search).get('returnTo')));try{void browserDb().auth.getUser().then(({data})=>setSignedIn(!!data.user))}catch(e){setError((e as Error).message)}},[]);
 async function google(){
  if(!essential){setError('필수 가입 안내를 확인해 주세요.');return}
  setBusy(true);setError('');
  try{
   sessionStorage.setItem('hot-pending-consent',JSON.stringify({essential:true,marketingEmail:marketing,returnTo}));
   const {error}=await browserDb().auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/account/callback',queryParams:{prompt:'select_account'}}});
   if(error)throw error;
  }catch(e){setBusy(false);setError((e as Error).message)}
 }
 async function finish(){
  if(!essential){setError('필수 가입 안내를 확인해 주세요.');return}
  setBusy(true);setError('');
  try{
   await api('/api/customer/consents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({essential:true,marketingEmail:marketing,version:VERSION})});
   window.dispatchEvent(new Event('hot-customer-change'));
   location.assign(returnTo);
  }catch(e){setBusy(false);setError((e as Error).message)}
 }
 return <main className="terms-page join-page"><Brand/><a href="/" className="text-link">← 메뉴 지도로</a><div className="eyebrow">NOWGO UNIFIED ACCOUNT</div><h1>한 번 가입하고<br/>한 접시를 알려요.</h1><p>HOT에서 가입해도 NOWGO와 같은 계정을 사용합니다. 이미 NOWGO 회원이라면 같은 구글 계정으로 계속하세요.</p>
  <section className="join-card"><h2>가입 전에 확인해 주세요</h2><p>HOT은 회원 ID, 저장·제보 이력, 제보할 때 적은 연락처·사업자번호와 사진을 제보 운영 및 문의에 사용합니다. 연락처와 사업자번호는 공개하지 않습니다. 회원 탈퇴나 해당 제보 삭제 시 삭제하며 법령상 보존 의무가 있는 기록은 해당 기간에만 분리 보관합니다. 필수 이용에 동의하지 않아도 지도는 볼 수 있지만 제보·저장은 이용할 수 없습니다.</p>
  <label className="consent"><input type="checkbox" checked={essential} onChange={e=>setEssential(e.target.checked)}/><span>[필수] <a href="/terms" target="_blank" rel="noreferrer">HOT 이용·개인정보 안내</a> 및 <a href="https://www.nowgo.space/legal/privacy" target="_blank" rel="noreferrer">NOWGO 개인정보 처리방침</a>을 확인하고 가입에 동의합니다.</span></label>
  <label className="consent"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/><span>[선택] 이벤트 소식을 이메일로 받겠습니다. 동의하지 않아도 모든 기능을 이용할 수 있습니다.</span></label>
  {signedIn?<button className="submit-button" onClick={finish} disabled={busy}>{busy?'연결하는 중':'이 계정으로 HOT 이용하기 ↗'}</button>:<button className="submit-button" onClick={google} disabled={busy}>{busy?'연결하는 중':'구글로 통합회원 가입·로그인 ↗'}</button>}
  {error&&<p className="customer-error" role="alert">{error}</p>}</section>
  <p className="small-note">공식 점주 표시는 NOWGO 매장 관리 권한 확인을 받은 회원에게만 적용됩니다.</p>
 </main>
}
