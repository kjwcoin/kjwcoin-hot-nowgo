'use client';
import {StorefrontScene} from '@/components/storefront-scene';
import {ownerTrustLevel, type OwnerStore} from '@/lib/owner-operations';
import {TrustInsignia} from './trust-insignia';
import styles from './owner-trust-panel.module.css';

export const dateLabel = (date: string) => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(date));
export default function OwnerTrustCard({store, checkedAt, delayed}: {store: OwnerStore; checkedAt: string; delayed: boolean}) {
  const rank = ownerTrustLevel(store.penaltyPoints);
  return <section className={styles.panel} aria-label="점주 레벨과 패널티">
    <header className={styles.heading}><h2><span>NOWGO</span>점주 레벨 &amp; 패널티</h2><span className={styles.live} data-delayed={delayed} role="status">{delayed ? '갱신 지연 · 다시 확인 중' : '실시간 반영 · 15초 갱신'}</span></header>
    <StorefrontScene storeName={store.name} level={rank.level}/>
    <div className={styles.readings}>
      <div className={styles.reading} data-metric="trust"><h3>점주 신뢰 레벨</h3>
        <div className={styles.scoreLine}><TrustInsignia level={rank.level} tone="color" className={styles.insignia}/><strong className={styles.level}>LV.{rank.level}</strong><span className={styles.divider}/><strong className={styles.score}>{rank.score}</strong><span className={styles.unit}>신뢰 점수</span></div>
        <div className={styles.meter} role="meter" aria-label="신뢰 점수" aria-valuemin={0} aria-valuemax={30} aria-valuenow={rank.score}><span style={{width: `${rank.score / 30 * 100}%`}}/></div>
      </div>
      <div className={styles.reading} data-metric="penalty"><h3>누적 패널티</h3><div className={styles.scoreLine}><strong className={styles.score}>{rank.penalty}</strong><span className={styles.total}>/ 30</span></div>
        <div className={styles.ticks} role="meter" aria-label="누적 패널티" aria-valuemin={0} aria-valuemax={30} aria-valuenow={rank.penalty}>{Array.from({length: 30}, (_, i) => <span key={i} data-filled={i < rank.penalty}/>)}</div>
      </div>
    </div>
    {store.disabled && <p className={styles.suspension} role="status">신뢰 0점 · 매장 정보 공개와 상태 설정이 중단되었습니다. 기존 단골·매장·회원·예약·결제 데이터는 나우고 서버에 보존됩니다.</p>}
    <div className={styles.history}>
      <div className={styles.historyTitle}><h3>최근 감점 내역</h3><time dateTime={checkedAt}>{dateLabel(checkedAt)} 확인</time></div>
      {store.incidents.length === 0 ? <p className={styles.empty}>누적된 감점 내역이 없습니다.</p> : <ul className={styles.events}>{store.incidents.map(event => <li key={event.id}><span className={styles.eventIcon} aria-hidden>i</span><div className={styles.eventCopy}><strong>{event.kind === 'soldout' ? '메뉴 품절 미반영' : '영업 상태 불일치'}</strong><span>고객 {event.consensusCount}명 일치 제보 · <time dateTime={event.detectedAt}>{dateLabel(event.detectedAt)}</time></span></div><div className={styles.change}><span>신뢰 −{event.penaltyPoints}</span><span>패널티 +{event.penaltyPoints}</span></div></li>)}</ul>}
      <details className={styles.rules}><summary>레벨·패널티 기준 보기</summary><p>가입 시 레벨 5 · 신뢰 30점에서 시작합니다. 서로 다른 로그인 고객 3명 이상의 일치 제보로 점주의 영업·품절 정보가 정정되면 건당 신뢰 5점 차감, 패널티 5점 누적됩니다. 마지막 점주 상태 반영 이후의 제보를 기준으로 같은 정정은 한 번만 계산합니다.</p>
        <div className={styles.levels}>{[[5,'25–30'],[4,'19–24'],[3,'13–18'],[2,'7–12'],[1,'0–6']].map(([level, range]) => <span key={level} data-level={level} data-current={rank.level === level}><b>LV.{level}</b>{range}점</span>)}</div>
        <p>0점이면 미니홈피 공개 접속과 매장 데이터 제공이 중단됩니다. 기존 데이터는 보존되지만 해당 점주에게 제공되지 않습니다. 매일 방문하지 않았다는 이유만으로 자동 감점되지는 않습니다.</p>
      </details>
    </div>
  </section>;
}
