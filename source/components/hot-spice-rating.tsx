'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {api, ApiError} from '@/lib/client';
import {isSpiceLevel, parseSpiceSummary, type SpiceLevel, type SpiceSummary} from '@/lib/hot-spice';

export const SPICE_REQUEST_TIMEOUT_MS = 12_000;

export class SpiceRequestTimeout extends Error {
  constructor() { super('spice_request_timeout'); this.name = 'SpiceRequestTimeout'; }
}
class SpiceRequestCancelled extends Error {
  constructor() { super('spice_request_cancelled'); this.name = 'SpiceRequestCancelled'; }
}

/** Bound the complete client call, including session restoration before fetch. */
export function requestSpiceWithinDeadline<T>(request: (signal: AbortSignal) => Promise<T>, controller: AbortController): Promise<T> {
  const signal = controller.signal;
  if (signal.aborted) return Promise.reject(new SpiceRequestCancelled());
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancelled);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true; cleanup(); reject(error);
    };
    const cancelled = () => fail(new SpiceRequestCancelled());
    const timer = setTimeout(() => {
      fail(new SpiceRequestTimeout());
      controller.abort();
    }, SPICE_REQUEST_TIMEOUT_MS);
    signal.addEventListener('abort', cancelled, {once: true});
    Promise.resolve().then(() => {
      if (signal.aborted) throw new SpiceRequestCancelled();
      return request(signal);
    }).then(value => {
      if (settled) return;
      settled = true; cleanup(); resolve(value);
    }, fail);
  });
}

type Requests = {
  active: boolean;
  generation: number;
  read: AbortController | null;
  write: AbortController | null;
};

// Each menu receives fresh state even if another caller omits its own React key.
export default function HotSpiceRating({menuId}: {menuId: string}) {
  return <MenuSpiceRating key={menuId} menuId={menuId}/>;
}

function MenuSpiceRating({menuId}: {menuId: string}) {
  const [summary, setSummary] = useState<SpiceSummary | null>(null);
  const [level, setLevel] = useState<SpiceLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loginRequired, setLoginRequired] = useState(false);
  const requests = useRef<Requests>({active: false, generation: 0, read: null, write: null});

  const loadSummary = useCallback((restoreOwnLevel = false): Promise<SpiceSummary | null> => {
    const lifecycle = requests.current;
    const expected = lifecycle.generation;
    lifecycle.read?.abort();
    const controller = new AbortController();
    lifecycle.read = controller;
    const current = () => lifecycle.active && expected === lifecycle.generation && lifecycle.read === controller;
    return requestSpiceWithinDeadline(
      signal => api<unknown>('/api/spice-ratings?menuId=' + encodeURIComponent(menuId), {signal}), controller,
    ).then(value => {
      const data = parseSpiceSummary(value, menuId);
      if (!current()) return null;
      setSummary(data);
      setLoginRequired(false);
      if (restoreOwnLevel) setLevel(data.myLevel);
      return data;
    }).catch(error => {
      if (!current()) return null;
      const needsLogin = error instanceof ApiError && error.status === 401;
      setSummary(null);
      setLoginRequired(needsLogin);
      setMessage(needsLogin ? '로그인을 다시 확인해 주세요. 로그인한 뒤 내 평가를 불러올 수 있어요.' :
        error instanceof SpiceRequestTimeout ? '12초 안에 평가 현황을 확인하지 못했어요. 다시 조회해 주세요.' :
        '평가 현황을 확인하지 못했어요. 새로고침해 주세요.');
      return null;
    }).finally(() => {
      if (current()) { lifecycle.read = null; setLoading(false); }
    });
  }, [menuId]);

  useEffect(() => {
    const lifecycle = requests.current;
    lifecycle.active = true;
    lifecycle.generation += 1;
    void loadSummary(true);
    return () => {
      lifecycle.active = false;
      lifecycle.generation += 1;
      lifecycle.read?.abort();
      lifecycle.write?.abort();
    };
  }, [loadSummary]);

  async function save() {
    const lifecycle = requests.current;
    if (!lifecycle.active || lifecycle.write || lifecycle.read || !isSpiceLevel(level) || !summary) return;
    const expected = lifecycle.generation, selectedLevel = level;
    const controller = new AbortController();
    lifecycle.write = controller;
    const current = () => lifecycle.active && expected === lifecycle.generation && lifecycle.write === controller;
    setSaving(true); setMessage(''); setLoginRequired(false);
    try {
      const result = await requestSpiceWithinDeadline(signal => api<{saved?: boolean; menuId?: string; level?: number}>('/api/spice-ratings', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({menuId, level: selectedLevel}), signal,
      }), controller);
      if (!current()) return;
      if (result.saved !== true || result.menuId !== menuId || result.level !== selectedLevel)
        throw Error('save_unverified');
      setMessage('내 평가를 저장했습니다. 최신 집계를 확인하고 있어요.');
      setLoading(true);
      const refreshed = await loadSummary(true);
      if (current()) setMessage(refreshed?.myLevel === selectedLevel ? '내 평가와 최신 집계를 확인했습니다.' : refreshed ?
        '평가 저장은 확인했지만 현재 내 평가 값이 달라요. 평가 현황을 다시 확인해 주세요.' :
        '내 평가는 저장했습니다. 집계를 확인하지 못했으니 평가 현황을 새로고침해 주세요.');
    } catch (error) {
      if (!current()) return;
      const needsLogin = error instanceof ApiError && error.status === 401;
      const uncertain = !(error instanceof ApiError) || error.status >= 500 || error.code === 'SAVE_UNVERIFIED';
      setLoginRequired(needsLogin);
      if (uncertain) {
        setSummary(null);
        setMessage('평가 저장 결과를 확인하지 못했어요. 저장되었을 수 있으니 다시 저장하기 전에 평가 현황을 새로고침해 내 평가를 확인해 주세요.');
      } else setMessage(needsLogin ? 'NOWGO 통합회원 로그인 후 평가할 수 있어요.' : error.message);
    } finally {
      const stillCurrent = current();
      if (lifecycle.write === controller) lifecycle.write = null;
      if (stillCurrent) setSaving(false);
    }
  }

  function refresh() {
    if (requests.current.write) return;
    setLoading(true); setMessage(''); setLoginRequired(false);
    void loadSummary(true);
  }

  return <section aria-label="메뉴 매운맛 평가" aria-busy={loading || saving} style={{padding: 14, border: '1px solid #e6dcd5', borderRadius: 12, marginTop: 14}}>
    <h3 style={{fontSize: 16, margin: '0 0 8px'}}>이 메뉴, 얼마나 매울까요?</h3>
    <p style={{fontSize: 13}}>{loading ? '방문자 평가 확인 중…' : !summary ? '방문자 평가 확인 불가' : <>
      방문자 평가 중앙값: <strong>{summary.median === null ? '아직 평가가 없어요' : `${summary.median}/7단계`}</strong>
      {' · '}{summary.count}명{summary.provisional ? ' · 초기 평가' : ''}
    </>}</p>
    <p style={{fontSize: 12, color: '#62584f'}}>점주 안내 맵기와 별도로 집계합니다. 같은 메뉴를 다시 평가하면 내 이전 평가가 수정됩니다.</p>
    <fieldset disabled={saving || loading || !summary} style={{border: 0, margin: 0, padding: 0}}>
      <legend style={{fontSize: 13}}>내가 느낀 매운맛{summary?.myLevel ? ` · 저장된 내 평가 ${summary.myLevel}단계` : ''}</legend>
      <div style={{display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8}}>
        {([1, 2, 3, 4, 5, 6, 7] as const).map(value => <button key={value} type="button" aria-label={`매운맛 ${value}단계`} aria-pressed={level === value} onClick={() => setLevel(value)} style={{minWidth: 36, minHeight: 40, flex: 1, borderRadius: 6, border: '1px solid #d8c5bc', background: level === value ? '#bb3323' : '#fff', color: level === value ? '#fff' : '#36251c'}}>{value}</button>)}
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 5}}><span>1 순한맛</span><span>7 극강의 매운맛</span></div>
      <button type="button" disabled={!isSpiceLevel(level)} onClick={() => void save()} style={{marginTop: 12, padding: '10px 14px', border: 0, borderRadius: 7, background: '#bb3323', color: '#fff', fontWeight: 700}}>{saving ? '저장 중…' : '내 평가 저장 / 수정'}</button>
    </fieldset>
    <button type="button" disabled={loading || saving} onClick={refresh} style={{marginTop: 10, fontSize: 12, textDecoration: 'underline'}}>평가 현황 새로고침</button>
    {message && <p role="status" style={{fontSize: 12, marginTop: 8}}>{message}</p>}
    {loginRequired && <a href={'/account/join?type=user&returnTo=' + encodeURIComponent('/?report=' + menuId)} style={{fontSize: 13}}>통합회원 로그인하고 돌아오기 ↗</a>}
  </section>;
}
