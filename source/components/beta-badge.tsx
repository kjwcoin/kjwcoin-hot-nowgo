import type { ReactNode } from 'react';
import styles from './beta-badge.module.css';

export default function BrandWithBeta({ children }: { children: ReactNode }) {
  return <div className={styles.lockup}>{children}<span role="img" aria-label="베타 서비스" className={styles.badge}><span aria-hidden="true" className={styles.label}>BETA</span></span></div>;
}
