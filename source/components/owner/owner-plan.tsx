import {MAP_OWNER_FEATURES} from '@/lib/map-subscription';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import styles from './owner-pages.module.css';
export default function OwnerPlan({variant}:{variant:SiteVariant}){return <aside className={`${styles.card} ${styles.plan}`} aria-label="기본 매장 관리 안내"><p className={styles.eyebrow}>{siteConfig(variant).name} MAP · OWNER</p><h2>기본 매장 관리는 무료</h2><div className={styles.price}>무료</div><p className={styles.vat}>광고 상품은 별도</p><ul className={styles.features}>{MAP_OWNER_FEATURES.map(item=><li key={item}>{item}</li>)}</ul><p className={styles.hint}>우리 집 매운맛 광고는 월 8,000원부터, VAT 별도입니다. 최고 예산 낙찰자만 결제합니다.</p></aside>}
