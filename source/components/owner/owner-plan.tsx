import {MAP_OWNER_FEATURES} from '@/lib/map-subscription';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import styles from './owner-pages.module.css';
export default function OwnerPlan({variant}:{variant:SiteVariant}){return <aside className={`${styles.card} ${styles.plan}`} aria-label="지도 구독 요금"><p className={styles.eyebrow}>{siteConfig(variant).name} MAP · OWNER</p><h2>매장 운영에 필요한 네 가지</h2><div className={styles.price}>8,000원<small>/ 월</small></div><p className={styles.vat}>부가세 포함</p><ul className={styles.features}>{MAP_OWNER_FEATURES.map(item=><li key={item}>{item}</li>)}</ul><p className={styles.hint}>선택한 지도에 적용되는 월 구독입니다. HOT·SWEET·RICH는 각각 별도로 구독합니다.</p></aside>}
