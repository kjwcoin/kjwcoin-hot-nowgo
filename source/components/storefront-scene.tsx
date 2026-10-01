"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { TrustInsignia } from "./owner/trust-insignia";
import styles from "./storefront-scene.module.css";

/** Shared artwork; the sign always uses the registered store name. */
export function StorefrontScene({ storeName, level }: { storeName: string; level?: number }) {
  const guideId = useId();
  const [guideOpen, setGuideOpen] = useState(false);
  const nameLength = Array.from(storeName).length;
  const rank = level && Number.isInteger(level) && level >= 1 && level <= 5 ? level : null;
  return <div className={styles.storefront} data-storefront
    onMouseEnter={() => setGuideOpen(true)} onMouseLeave={() => setGuideOpen(false)}
    onFocus={() => setGuideOpen(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setGuideOpen(false); }}
    onKeyDown={(event) => { if (event.key === "Escape") setGuideOpen(false); }}>
    {nameLength > 14 ? <p className={styles.fullName}>{storeName}</p> : null}
    <div className={styles.scene}>
      <div className={styles.artwork} role="img" aria-label={`${storeName} 매장 간판${rank ? ` · 점주 레벨 ${rank} 휘장` : ""}`}>
        <Image src="/brand/owner-trust/city-pub-color-v2.webp" alt="" fill sizes="(max-width: 700px) 128vw, 1400px" unoptimized />
        <span className={`${styles.light} ${styles.windowLeft}`} />
        <span className={`${styles.light} ${styles.windowRight}`} />
        <span className={`${styles.light} ${styles.door}`} />
        <div className={styles.sign} data-storefront-sign><span style={{ fontSize: `${nameLength > 10 ? Math.min(2.4, 10 / Math.sqrt(nameLength)) : 3.1}cqw` }}>{storeName}</span></div>
        {rank ? <div className={styles.badge} data-storefront-level={rank}>
          <TrustInsignia level={rank} tone="color" />
          <span>점주 LV.{rank}</span>
        </div> : null}
      </div>
      <button className={styles.guideButton} type="button" aria-label="점주 신뢰 레벨 안내" aria-describedby={guideOpen ? guideId : undefined} onClick={() => setGuideOpen(true)}>ⓘ 레벨 안내</button>
    </div>
    <div id={guideId} role="tooltip" hidden={!guideOpen} className={styles.guide}>
      <strong>오늘의 가게 소식을 직접 알려 주세요</strong>
      <p>서로 다른 로그인 고객 <b>3명 이상</b>의 일치 제보가 점주 정보보다 우선 적용되어 영업·품절 정보가 정정되면, 건당 신뢰 점수가 <b>5점씩 차감</b>되고 패널티가 <b>5점씩 누적</b>됩니다. 점주의 마지막 상태 반영 이후 제보를 기준으로 판단하며, 같은 정정은 한 번만 계산합니다.</p>
      <p>가입 시 <b>30점 · 레벨 5</b>에서 시작합니다.<br/>LV.5 25–30점 · LV.4 19–24점 · LV.3 13–18점 · LV.2 7–12점 · LV.1 0–6점</p>
      <p><b>0점이면 미니홈피 URL의 공개 접속이 중단되어 고객이 미니홈피를 이용할 수 없습니다.</b> 그동안 모은 단골과 매장·회원·예약·결제 등 기존 데이터는 나우고 서버에 보존되지만, 해당 점주에게는 제공되지 않습니다.</p>
      <p className={styles.encouragement}>꾸준한 실시간 반영으로 우리 가게의 신뢰를 함께 지켜 주세요.</p>
    </div>
  </div>;
}

