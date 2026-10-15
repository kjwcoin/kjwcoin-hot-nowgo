'use client';

import {useRef, useState, type KeyboardEvent, type ReactNode} from 'react';
import favoriteStyles from './regular-favorite.module.css';
import styles from './source-readonly-actions.module.css';

type Action = 'favorite' | 'report' | 'request' | 'claim';
type Props = {kind: 'favorite' | 'report' | 'owner'; children?: ReactNode};
const explanations: Record<Action, string> = {
 favorite: '이 매장은 공공자료로 소개하는 단계예요. 고객 계정과의 연결 전에는 단골저장을 할 수 없으며, 이 버튼으로 내 목록에 추가되지 않아요.',
 report: '이 공공자료 메뉴에 연결되는 맵기·맛 제보의 등록과 집계는 아직 연결되지 않았어요. 지금은 입력하거나 저장할 수 없어요. 기존 일반 제보는 화면의 제보 등록 메뉴에서 별도로 이용할 수 있지만, 이 공공자료 메뉴와 연결되는 제보 기능은 아니에요.',
 request: '이 공공자료 매장의 점주 영업정보 요청 기능은 아직 연결되지 않았어요. 지금은 요청을 접수하거나 요청 수를 집계하지 않아요.',
 claim: '이 공공자료 매장에 연결되는 점주 소유권 확인 기능은 아직 연결되지 않았어요. 이 화면에서는 신청을 받지 않으며, 점주가 확인된 매장으로 표시하지 않아요.',
};

/** Source-only controls disclose unavailable features. They never submit or persist anything. */
export default function SourceReadonlyActions({kind, children}: Props) {
 const [active, setActive] = useState<Action | null>(null);
 const trigger = useRef<HTMLButtonElement | null>(null);
 const open = (action: Action, button: HTMLButtonElement) => {trigger.current = button; setActive(action);};
 const close = () => {setActive(null); trigger.current?.focus();};
 const dismiss = (event: KeyboardEvent<HTMLElement>) => {if (active && event.key === 'Escape') {event.preventDefault(); close();}};
 const explanation = active ? <div className={styles.explanation}>
  <p role="status">{explanations[active]}</p>
  <button type="button" className={styles.textButton} onClick={close}>닫기</button>
 </div> : null;

 if (kind === 'favorite') return <section className={favoriteStyles.section} aria-label="공공자료 매장 단골 안내" data-source-readonly-action="favorite" onKeyDown={dismiss}>
  <div className={favoriteStyles.actions}>
   <button type="button" className={favoriteStyles.save} aria-expanded={active === 'favorite'} onClick={event => open('favorite', event.currentTarget)}>♡ 단골저장</button>
   {children}
  </div>
  <p className={styles.notice}>이 매장은 아직 내 단골 목록에 저장할 수 없어요.</p>
  {explanation}
 </section>;

 if (kind === 'report') return <section className={styles.report} aria-label="공공자료 메뉴 맛 제보 안내" data-source-readonly-action="report" onKeyDown={dismiss}>
  <h3>방문 후 맛을 확인해 주세요</h3>
  <p>직접 먹어보셨나요? 맵기 단계와 맛의 특징을 제보해 주세요!</p>
  <button type="button" className={styles.button} aria-expanded={active === 'report'} onClick={event => open('report', event.currentTarget)}>메뉴별 맵기·맛 제보</button>
  <small>이 공공자료 메뉴의 제보 등록·저장·집계는 아직 연결되지 않았어요.</small>
  {explanation}
 </section>;

 return <section id="owner-information" className={styles.owner} aria-label="공공자료 매장 점주 연결 안내" data-source-readonly-action="owner" onKeyDown={dismiss}>
  <p>이 가게의 영업정보를 점주에게 확인받고 싶나요?</p>
  <button type="button" className={styles.button} aria-expanded={active === 'request'} onClick={event => open('request', event.currentTarget)}>＋ 점주 영업정보 요청</button>
  <button type="button" className={styles.textButton} aria-expanded={active === 'claim'} onClick={event => open('claim', event.currentTarget)}>이 매장의 점주이신가요? 소유권 확인</button>
  <small>점주 연결 전에는 요청이나 신청이 접수되지 않아요.</small>
  {explanation}
 </section>;
}
