'use client';

import {useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {returnPath} from '@/lib/integration-policy';
import styles from './oauth-buttons.module.css';

export default function OAuthButtons({flavor, returnTo = '/'}: {flavor: string; returnTo?: string}) {
  const [pending, setPending] = useState<'kakao' | 'google' | null>(null);
  const [error, setError] = useState('');

  async function signIn(provider: 'kakao' | 'google') {
    if (pending) return;
    setPending(provider);
    setError('');
    try {
      window.dispatchEvent(new Event('nowgo-report-save-draft'));
      sessionStorage.setItem(`${flavor}-pending-consent`, JSON.stringify({essential: false, returnTo: returnPath(returnTo)}));
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
  }

  return <div className={styles.options}>
    <div className={styles.actions}>
      <button type="button" className={`${styles.button} ${styles.kakao}`} disabled={!!pending} onClick={() => void signIn('kakao')}>
        {pending === 'kakao' ? '카카오 연결 중' : '카카오로 로그인'}
      </button>
      <button type="button" className={`${styles.button} ${styles.google}`} disabled={!!pending} onClick={() => void signIn('google')}>
        {pending === 'google' ? '구글 연결 중' : '구글로 로그인'}
      </button>
    </div>
    {error && <p className="customer-error" role="alert">{error}</p>}
  </div>;
}
