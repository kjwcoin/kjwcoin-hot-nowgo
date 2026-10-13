'use client';

import {useActivity} from './activity/use-activity';
import CharacterArt from './activity/character-art';
import {growth, RANKS, type ActivitySnapshot} from '@/lib/activity/model';
import styles from './source-account-character.module.css';

export type SourceAccountState = Pick<ReturnType<typeof useActivity>, 'data' | 'error' | 'signedIn' | 'owner'>;
type Props = {returnTo: string; state?: SourceAccountState; readOnly?: boolean};

function loginPath(returnTo: string) {
 const path = returnTo === '/account' || (returnTo === returnTo.trim() && /^\/p\/[a-zA-Z0-9_-]{1,160}$/.test(returnTo)) ? returnTo : '/';
 return '/account/join?type=user&returnTo=' + encodeURIComponent(path);
}

function validSnapshot(data: ActivitySnapshot | null): data is ActivitySnapshot {
 if (!data || data.planet !== 'hot' || !Number.isSafeInteger(data.xp) || data.xp < 0) return false;
 const profile = data.profile;
 return !!profile && typeof profile.character_name === 'string' &&
  (profile.character_id === null || (Number.isInteger(profile.character_id) && profile.character_id >= 0 && profile.character_id < RANKS.length));
}

/** Pure rendering of an existing verified-account state; no auth or activity writes. */
export function SourceAccountCharacterView({state, returnTo}: {state: SourceAccountState; returnTo: string}) {
 const {signedIn, owner, data, error} = state;
 const ownerAccount = signedIn === true && owner === true;
 const ready = signedIn === true && owner === false && !error && validSnapshot(data);
 const loginHref = loginPath(returnTo);

 if (!ready) {
  const failed = Boolean(error) || (signedIn === true && owner === false && data !== null && !validSnapshot(data));
  const value = ownerAccount ? '고객 계정에서 확인' : signedIn === false ? '로그인 후 확인' : failed ? '확인 불가' : '확인 중';
  const message = ownerAccount ? '점주 계정에는 고객 캐릭터·EXP를 표시하지 않아요.'
   : signedIn === false ? '로그인하면 내 ID의 캐릭터·레벨·EXP를 확인할 수 있어요.'
   : failed ? '내 계정 정보를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.'
   : '내 계정의 캐릭터 정보를 확인하고 있어요.';
  return <section className={styles.account} aria-label="내 계정 캐릭터">
   <div className={styles.copy}>
    <h3>내 계정</h3>
    <p role={failed && !ownerAccount ? 'alert' : 'status'}>{message}</p>
    <dl className={styles.values}>
     <div><dt>캐릭터</dt><dd>{value}</dd></div>
     <div><dt>레벨</dt><dd>{value}</dd></div>
     <div><dt>EXP</dt><dd>{value}</dd></div>
    </dl>
    {ownerAccount ? <a className={styles.link} href="/owner">내 매장관리</a>
     : <a className={styles.link} href={loginHref}>{signedIn === false ? '로그인하고 내 캐릭터 보기' : '로그인 상태 확인'}</a>}
   </div>
  </section>;
 }

 const earned = growth(data.xp);
 const label = data.profile.character_name.trim() || earned.rank.name;
 const characterIndex = data.profile.character_id ?? earned.character;
 return <section className={styles.account} aria-label="내 계정 캐릭터">
  <figure className={styles.character}>
   <CharacterArt planet="hot" index={characterIndex} label={`${label} · 내 캐릭터`} className={styles.avatar}/>
   <figcaption>{label}</figcaption>
  </figure>
  <div className={styles.copy}>
   <h3>내 계정 · 내 캐릭터</h3>
   <p>로그인한 내 ID의 캐릭터·레벨·EXP입니다.</p>
   <dl className={styles.values}>
    <div><dt>캐릭터 등급</dt><dd>{earned.rank.name}</dd></div>
    <div><dt>레벨</dt><dd>{earned.level}</dd></div>
    <div><dt>EXP</dt><dd>{data.xp.toLocaleString('ko-KR')} EXP</dd></div>
   </dl>
  </div>
 </section>;
}

function ConnectedSourceAccountCharacter({returnTo}: {returnTo: string}) {
 const state = useActivity('hot');
 return <SourceAccountCharacterView state={state} returnTo={returnTo}/>;
}

/** Pass an already-mounted activity state when available to avoid a duplicate subscription. */
export default function SourceAccountCharacter({state, returnTo, readOnly=false}: Props) {
 // The legacy snapshot can initialize a profile. Do not mount an extra call for a public listing.
 if (readOnly) return <section className={styles.account} aria-label="내 계정 캐릭터">
  <div className={styles.copy}><h3>내 계정 · 내 캐릭터</h3>
   <p>캐릭터와 EXP는 기존 내 계정 화면에서 확인해 주세요.</p>
   <dl className={styles.values}><div><dt>캐릭터</dt><dd>이 화면에서는 미표시</dd></div><div><dt>EXP</dt><dd>이 화면에서는 미표시</dd></div></dl>
   <a className={styles.link} href="/account">내 계정에서 확인</a>
  </div>
 </section>;
 return state ? <SourceAccountCharacterView state={state} returnTo={returnTo}/>
  : <ConnectedSourceAccountCharacter returnTo={returnTo}/>;
}
