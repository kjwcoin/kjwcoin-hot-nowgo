'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {api} from '@/lib/client';
import OAuthButtons from './oauth-buttons';

export type OwnedStore = {store_id: string; name: string; address: string; slug: string; owner_code: string | null};
type Membership = {
  customerReady: boolean;
  consentRequired: boolean;
  ownedStores: OwnedStore[];
  loading: boolean;
  error: string;
};
const initial: Membership = {customerReady: false, consentRequired: false, ownedStores: [], loading: true, error: ''};

export function useReportMembership(changeEvent: string) {
  const [state, setState] = useState<Membership>(initial);
  const request = useRef(0);
  const load = useCallback(() => {
    const current = ++request.current;
    let member = false;
    return api<{customer: unknown; consentRequired: boolean}>('/api/customer/me').then(profile => {
      if (current !== request.current) return;
      member = !!profile.customer;
      setState({customerReady: member, consentRequired: profile.consentRequired, ownedStores: [], loading: member, error: ''});
      if (!member) return;
      return api<{stores: OwnedStore[]}>('/api/customer/owned-stores').then(({stores}) => {
        if (current === request.current) setState({customerReady: true, consentRequired: false, ownedStores: stores, loading: false, error: ''});
      });
    }).catch(() => {
      if (current === request.current) setState({
        customerReady: member, consentRequired: false, ownedStores: [], loading: false,
        error: member ? '매장 권한을 불러오지 못했어요. 다시 확인해 주세요.' : '회원 정보를 불러오지 못했어요. 다시 확인해 주세요.',
      });
    });
  }, []);
  const refresh = useCallback(() => {
    setState(previous => ({...previous, loading: true, error: ''}));
    return load();
  }, [load]);
  const cancel = useCallback(() => { ++request.current; }, []);

  useEffect(() => {
    void load();
    const reload = () => void refresh();
    window.addEventListener(changeEvent, reload);
    window.addEventListener('focus', reload);
    return () => {
      cancel();
      window.removeEventListener(changeEvent, reload);
      window.removeEventListener('focus', reload);
    };
  }, [changeEvent, load, refresh, cancel]);
  return {...state, refresh};
}

export default function ReportAccess({role, flavor, membership, storeId, onStoreChange}: {
  role: string;
  flavor: string;
  membership: ReturnType<typeof useReportMembership>;
  storeId: string;
  onStoreChange: (id: string) => void;
}) {
  const {customerReady, consentRequired, ownedStores, loading, error, refresh} = membership;
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const matches = normalized ? ownedStores.filter(store =>
    [store.name, store.address, store.slug, store.owner_code ?? '', store.store_id]
      .some(value => value.toLocaleLowerCase().includes(normalized))) : ownedStores;
  if (loading) return <p className="report-login-status" role="status">회원 및 매장 권한을 확인하고 있어요.</p>;
  if (error) return <div className="report-access"><p role="alert">{error}</p><button type="button" className="text-link" onClick={() => void refresh()}>다시 확인하기 ↗</button></div>;
  if (!customerReady) return <div className="report-access">
    <strong>{consentRequired ? `${flavor.toUpperCase()} 이용 동의를 완료해 주세요.` : role === 'owner' ? '점주 계정으로 가입·로그인해 주세요.' : '통합회원으로 가입·로그인해 주세요.'}</strong>
    <p>{role === 'owner' ? 'NOWGO에서 승인받은 내 매장을 선택해 공식 점주로 제보할 수 있어요.' : '로그인 후 작성한 제보를 제출할 수 있어요.'}</p>
    {consentRequired
      ? <a className="text-link" href="/account/join?returnTo=%2Fsuggestion%23report">이용 동의 완료하기 ↗</a>
      : <><a className="text-link" href="https://www.nowgo.space/account">점주·일반 사용자 선택 후 가입하기 ↗</a><p>이미 가입했다면 로그인하세요.</p><OAuthButtons flavor={flavor} returnTo="/suggestion#report"/></>}
  </div>;
  if (role !== 'owner') return <p className="report-login-status">로그인됨 · 손님으로 제보합니다.</p>;
  if (!ownedStores.length) return <div className="report-access">
    <strong>공식 점주 제보는 매장 권한 확인이 필요해요.</strong>
    <p>로그인은 완료됐어요. NOWGO에서 사업자 확인과 매장 소유권 승인을 마치면 내 매장이 나타납니다.</p>
    <a className="text-link" href="https://www.nowgo.space/account/join?type=owner" target="_blank" rel="noreferrer">내 매장 등록·권한 확인 ↗</a>
    <button type="button" className="text-link" onClick={() => void refresh()}>승인된 매장 다시 확인 ↗</button>
  </div>;
  return <label className="owner-store">NOWGO에서 확인된 내 매장
    <input type="search" value={query} placeholder="점주 ID 또는 상호명 검색" aria-label="점주 ID 또는 상호명 검색"
      onChange={event => {
        const value=event.target.value;setQuery(value);
        const key=value.trim().toLocaleLowerCase();
        const first=ownedStores.find(store=>[store.name,store.address,store.slug,store.owner_code??'',store.store_id]
          .some(field=>field.toLocaleLowerCase().includes(key)));
        onStoreChange(first?.store_id??'');
      }}/>
    <select name="storeId" value={matches.some(store=>store.store_id===storeId)?storeId:''} onChange={event => onStoreChange(event.target.value)} required>
      {!matches.length?<option value="">일치하는 매장이 없어요</option>:null}
      {matches.map(store => <option key={store.store_id} value={store.store_id}>{store.name} · {store.address} · {store.owner_code??'점주 ID 발급 전'}</option>)}
    </select>
    <small>선택한 매장의 공식 점주 제보로 등록됩니다.</small>
  </label>;
}
