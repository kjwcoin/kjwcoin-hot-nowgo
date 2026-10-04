'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {api, uuid} from '@/lib/client';
import {OWNER_STATES, businessDate, currentOverride, type ExpiryMode, type OwnerSnapshot, type Override} from '@/lib/owner-operations';
import OwnerTrustCard, {dateLabel} from './owner-trust-card';
import styles from './owner-operations.module.css';

export default function OwnerOperationsPanel({selectedStoreId}: {selectedStoreId?: string}) {
  const [snapshot, setSnapshot] = useState<OwnerSnapshot | null>(null);
  const [selected, setSelected] = useState('');
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('business_day');
  const [pending, setPending] = useState(false), [delayed, setDelayed] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [confirmShutdown, setConfirmShutdown] = useState(false);
  const sequence = useRef(0), mounted = useRef(true), saving = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await api<OwnerSnapshot>('/api/owner/operations', {cache: 'no-store'});
      if (!mounted.current || request !== sequence.current) return;
      setSnapshot(result); setDelayed(false);
    } catch {
      if (mounted.current && request === sequence.current) setDelayed(true);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const requests = sequence;
    void Promise.resolve().then(refresh);
    const reload = () => {if (document.visibilityState !== 'hidden' && !saving.current) void refresh();};
    const timer = setInterval(reload, 15000);
    window.addEventListener('focus', reload); window.addEventListener('online', reload);
    document.addEventListener('visibilitychange', reload);
    return () => {mounted.current = false; ++requests.current; clearInterval(timer); window.removeEventListener('focus', reload); window.removeEventListener('online', reload); document.removeEventListener('visibilitychange', reload);};
  }, [refresh]);
  const store = selectedStoreId ? snapshot?.stores.find(s => s.id === selectedStoreId) : snapshot?.stores.find(s => s.id === selected) ?? snapshot?.stores[0];
  const now = snapshot ? Date.parse(snapshot.checkedAt) : 0;
  const open = store ? currentOverride(store.overrides, 'open_status', now) : null;
  const crowding = store ? currentOverride(store.overrides, 'congestion', now) : null;
  const todayConfirmed = open && businessDate(open.setAt) === businessDate(snapshot!.checkedAt);
  async function mutate(kind: Override['kind'], value: string, active = true) {
    if (!store || saving.current || !store.canPublish || delayed) return;
    saving.current = true; setPending(true); setError(''); setMessage('');
    ++sequence.current;
    try {
      await api('/api/owner/operations', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({storeId: store.id, kind, value, active, expiryMode: value === 'permanently_closed' ? 'manual' : expiryMode, requestId: uuid()})});
      // Mark a save only after the canonical server command succeeds.
      if (mounted.current) {setMessage('저장되었습니다. 실시간 지도와 미니홈피에 반영됩니다.'); setConfirmShutdown(false);}
      window.dispatchEvent(new CustomEvent('nowgo-owner-status-change', {detail: {storeId: store.id}}));
      await refresh();
    } catch (caught) {if (mounted.current) setError(caught instanceof Error ? caught.message : '저장하지 못했습니다. 다시 시도해 주세요.');}
    finally {saving.current = false; if (mounted.current) setPending(false);}
  }
  if (!snapshot) return <div className={styles.panel}><p role="status">{delayed ? '매장 운영 정보를 불러오지 못했습니다.' : '내 매장 운영 정보를 확인하고 있습니다.'}</p>{delayed && <button type="button" onClick={() => void refresh()}>다시 확인하기</button>}</div>;
  if (!store) return <div className={styles.panel}><p>매장 소유권 확인 후 오늘 영업상태와 점주 신뢰를 관리할 수 있습니다.</p></div>;
  const locked = pending || delayed || !store.canPublish;
  const label = OWNER_STATES.find(s => s.value === open?.value)?.label;
  const hours = store.hours;
  const hoursText = hours?.open && hours.close ? `${hours.open}–${hours.close}${hours.breakStart && hours.breakEnd ? ` · 브레이크 ${hours.breakStart}–${hours.breakEnd}` : ''}` : hours?.text || '등록된 영업시간이 없습니다.';
  return <div className={styles.panel}>
    <div className={styles.toolbar}><strong>{store.name}</strong>{!selectedStoreId && snapshot.stores.length > 1 && <label>내 매장 <select value={store.id} disabled={pending} onChange={event => {setSelected(event.target.value); setConfirmShutdown(false); setError(''); setMessage('');}}>{snapshot.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}</div>
    <section className={styles.card} aria-label="오늘 영업상태 설정">
      <span className={styles.eyebrow}>오늘의 1순위</span><h2>오늘 영업상태 설정</h2><p className={styles.muted}>지금 상태를 누르면 미니홈피와 실시간 지도에 반영됩니다.</p>
      <div className={styles.reminder}>{todayConfirmed ? '오늘 상태 확인 완료. 마감·휴무·재료소진 시 다시 알려 주세요.' : '사장님, 오늘 상태를 먼저 알려 주세요. 매일 영업 시작 전에 한 번 확인해 주세요.'}</div>
      <div className={styles.status}><span className={styles.badge}>● {open ? `지금 공개 · ${label || '확인 필요'}` : '최신 점주 확인 필요'}</span>{open && <time className={styles.muted} dateTime={open.setAt}>{dateLabel(open.setAt)} 갱신</time>}</div>
      <p className={styles.muted}>{open ? `${dateLabel(open.expiresAt)}까지 표시 · 이후 다시 확인이 필요해요` : '최근 24시간 내 유효한 점주 상태가 없습니다.'}</p>
      {delayed && <p className={styles.notice} role="status">갱신이 지연되고 있습니다. 다시 확인할 때까지 상태 설정을 잠시 기다려 주세요.</p>}
      {store.disabled ? <p className={styles.notice}>누적 패널티 30점으로 매장 정보 공개와 상태 설정이 중단되었습니다. 아래 기준과 최근 감점 내역을 확인해 주세요.</p> : !store.canPublish && <p className={styles.notice}>구독 결제와 매장 소유권 확인이 필요하면 CEO@NOWGO.IO.KR로 문의해 주세요.</p>}
      <div className={styles.row}><h3>오늘 영업 상태</h3><div className={styles.duration} role="group" aria-label="자동 해제 방식">{([{value: 'business_day', label: '오늘만'}, {value: 'manual', label: '직접 해제'}] as const).map(mode => <button key={mode.value} type="button" aria-pressed={expiryMode === mode.value} disabled={pending} onClick={() => setExpiryMode(mode.value)}>{mode.label}</button>)}</div></div>
      <div className={styles.grid}>{OWNER_STATES.map(state => <button key={state.value} type="button" aria-pressed={open?.value === state.value} disabled={locked} onClick={() => state.value === 'permanently_closed' ? setConfirmShutdown(true) : void mutate('open_status', state.value)}>● {state.label}</button>)}</div>
      {confirmShutdown && <div className={styles.confirm} role="group" aria-label="폐업 상태 확인"><p>손님에게 ‘폐업’으로 공개할까요?</p><button type="button" disabled={locked} onClick={() => void mutate('open_status', 'permanently_closed')}>폐업으로 설정</button><button type="button" disabled={pending} onClick={() => setConfirmShutdown(false)}>취소</button></div>}
      <button className={styles.clear} type="button" disabled={locked || !open} onClick={() => void mutate('open_status', 'open', false)}>제보 상태로 되돌리기</button>
      <p className={styles.muted}>오늘만: 다음 새벽 4시에 자동 해제 · 직접 해제: 직접 변경 가능, 최신 정보는 최대 24시간 표시됩니다.</p>
      <div className={styles.divider}><h3>혼잡도</h3><div className={styles.crowding}>{([{value: 'full', label: '혼잡함'}, {value: 'available', label: '여유있음'}] as const).map(state => <button key={state.value} type="button" disabled={locked} aria-pressed={crowding?.value === state.value} onClick={() => void mutate('congestion', state.value, crowding?.value !== state.value)}>● {state.label}</button>)}</div><p className={styles.muted}>선택한 버튼을 다시 누르면 혼잡도 설정이 해제돼요.</p></div>
      <div className={styles.hours}><strong>등록 영업시간 · {hoursText}</strong></div>
      {pending && <p role="status">저장 중입니다.</p>}{message && <p className={styles.success} role="status">{message}</p>}{error && <p className={styles.error} role="alert">{error}</p>}
    </section>
    <OwnerTrustCard store={store} checkedAt={snapshot.checkedAt} delayed={delayed}/>

  </div>;
}
