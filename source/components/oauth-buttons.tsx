'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {APP_RETURN_COOKIE,appLoginReturn} from '@/lib/integration-policy';
import {returnPath} from '@/lib/integration-policy';

export default function OAuthButtons({flavor, returnTo = '/', accountType = 'user',initialProvider,includeApple=false}: {flavor: string; returnTo?: string; accountType?: 'user' | 'owner';initialProvider?:'google'|'kakao'|'apple';includeApple?:boolean}) {
  const [pending, setPending] = useState<'kakao' | 'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const signIn=useCallback(async(provider: 'kakao' | 'google' | 'apple')=>{
    if (pending) return;
    setPending(provider);
    setError('');
    try {
      window.dispatchEvent(new Event('nowgo-report-save-draft'));
      const appReturn=appLoginReturn(returnTo);document.cookie=APP_RETURN_COOKIE+'='+(appReturn?encodeURIComponent(appReturn):'')+'; Path=/; Max-Age='+(appReturn?'600':'0')+'; Secure; SameSite=Lax';
      sessionStorage.setItem(`${flavor}-pending-consent`, JSON.stringify({essential: false, returnTo: returnPath(returnTo), accountType}));
      if (location.hostname === 'nowgo.space' || location.hostname.endsWith('.nowgo.space')) {
        document.cookie = 'nowgo-flavor-oauth-return=' + encodeURIComponent(location.origin) + '; Path=/; Domain=.nowgo.space; Max-Age=600; Secure; SameSite=Lax';
      }
      const {error} = await browserDb().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: location.origin + '/account/callback',
          queryParams: provider === 'google' ? {prompt: 'select_account'} : undefined,
        },
      });
      if (error) throw error;
    } catch (error) {
      setPending(null);
      setError(error instanceof Error ? error.message : '로그인 연결을 다시 시도해 주세요.');
    }
  },[pending,flavor,returnTo,accountType]);
  const started=useRef(false);useEffect(()=>{if(initialProvider&&!started.current){started.current=true;void signIn(initialProvider)}},[initialProvider,signIn]);

  return <div className="oauth-options">
    <div className="unified-auth-actions">
      <button type="button" className="kakao-login-small" disabled={!!pending} onClick={() => void signIn('kakao')}>
        {pending === 'kakao' ? '카카오 연결 중' : '카카오로 가입·로그인'}
      </button>
      <button type="button" className="google-login-small" disabled={!!pending} onClick={() => void signIn('google')}>
        {pending === 'google' ? '구글 연결 중' : '구글로 가입·로그인'}
      </button>
      {includeApple&&<button type="button" className="apple-login-small" style={{background:'#000',color:'#fff',borderRadius:12,padding:'14px 18px'}} disabled={!!pending} onClick={()=>void signIn('apple')}>{pending==='apple'?'Apple 연결 중':'Apple로 가입·로그인'}</button>}
    </div>
    {error && <p className="customer-error" role="alert">{error}</p>}
  </div>;
}
