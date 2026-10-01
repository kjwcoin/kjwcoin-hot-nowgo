'use client';
import RegularHomeLink from './regular-home-link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {UserRound, LogOut} from 'lucide-react';
import {browserDb} from '@/lib/supabase-browser';
import styles from './customer-account.module.css';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import type {SiteVariant} from '@/lib/site-config';
import {planetForVariant, growth} from '@/lib/activity/model';
import dynamic from 'next/dynamic';
const ActivityWorld = dynamic(() => import('@/components/activity/activity-world'));
const OwnerOperationsPanel = dynamic(() => import('@/components/owner/owner-operations-panel'));
import {useActivity} from '@/components/activity/use-activity';
import '@/components/activity/activity.css';
import WorldEntry from './activity/world-entry';

export default function CustomerPanel({variant = 'hot', worldEntryOpen = false, onWorldEntryClose = () => {}, regularHref}: {variant?: SiteVariant; worldEntryOpen?: boolean; onWorldEntryClose?: () => void; regularHref?: string}) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [activityTab, setActivityTab] = useState('info');
  const [loggingOut, setLoggingOut] = useState(false), [logoutError, setLogoutError] = useState('');
  const planet = planetForVariant(variant), state = useActivity(planet);
  const owner = state.owner;
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError('');
    try {const {error} = await browserDb().auth.signOut({scope: 'local'}); if (error) throw error; window.location.reload();}
    catch {setLoggingOut(false); setLogoutError('로그아웃하지 못했어요. 다시 눌러 주세요.');}
  }
  return <>
    <div className={`customer-trigger ${styles.actions}`}>
      <Button className="activity-trigger" variant="ghost" disabled={state.signedIn === null || loggingOut} onClick={() => {
        if (!state.signedIn) {router.push('/account/join?returnTo=%2F'); return;}
        setActivityTab('info'); setOpen(true); if (owner === false) void state.refresh();
      }} aria-label={state.signedIn === null ? '계정 확인 중' : state.signedIn ? (owner ? '내 매장관리' : '내 활동') : '통합회원가입/로그인'}>
        <UserRound size={18}/><span>{state.signedIn === null ? '계정 확인 중' : state.signedIn ? (owner ? '내 매장관리' : '내 활동') : '통합회원가입/로그인'}</span>
        {owner === false && state.data && <b className="aw-mini-exp">레벨 {growth(state.data.xp).level}</b>}
      </Button>
      {regularHref && state.signedIn && owner === false && <RegularHomeLink variant={variant} className={styles.mobileRegular}>내 단골 목록</RegularHomeLink>}
      {state.signedIn && <Button className={styles.logout} variant="ghost" disabled={loggingOut} onClick={() => void logout()}><LogOut size={18}/><span>{loggingOut ? '로그아웃 중' : '로그아웃'}</span></Button>}
      {logoutError && <span className={styles.error} role="alert">{logoutError}</span>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className={owner ? styles.ownerDialog : 'aw-activity-dialog'}>
      <DialogTitle>{owner ? '내 매장관리' : '내 활동'}</DialogTitle>
      <DialogDescription>{owner ? '오늘 영업상태와 점주 레벨·패널티를 관리합니다.' : owner === null ? '계정의 매장 권한을 확인합니다.' : '나의 행성에서 쌓인 캐릭터·레벨·EXP·훈장과 모든 기록'}</DialogDescription>
      {owner === null ? <p role="status">{state.error ? '매장 권한을 불러오지 못했습니다. 창을 닫고 다시 시도해 주세요.' : '점주 권한 확인 중입니다.'}</p> : owner ? <OwnerOperationsPanel/> : <ActivityWorld planet={planet} state={state} initialTab={activityTab}/>}
    </DialogContent></Dialog>
    {owner === false && <WorldEntry planet={planet} state={state} open={worldEntryOpen && !open} onClose={onWorldEntryClose} onActivity={(tab = 'info') => {setActivityTab(tab); onWorldEntryClose(); setOpen(true); void state.refresh();}}/>}
  </>;
}
