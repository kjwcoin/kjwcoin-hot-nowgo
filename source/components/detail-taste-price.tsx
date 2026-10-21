import {money} from '@/lib/menus';
import type {SiteVariant} from '@/lib/site-config';

export default function DetailTastePrice({variant, level, price, isDemo, verifiedOwner}: {
  variant: SiteVariant; level: number; price: number; isDemo: boolean; verifiedOwner?: boolean;
}) {
  const maximum = variant === 'hot' ? 7 : 5;
  const stage = Math.min(maximum, Math.max(1, Math.trunc(level) || 1));
  const row = variant === 'sweet' ? 50 : 100;
  const priceNote = isDemo ? '예시' : verifiedOwner ? '공식 점주 제보 가격' : '고객 제보 가격';
  return <div className="explorer-taste-price" role="group" aria-label={`${variant.toUpperCase()} ${stage}단계, ${money(price)}, ${priceNote}`}>
    {variant === 'hot'
      ? <span aria-hidden="true" style={{fontWeight: 800, color: '#b53021', border: '1px solid #e8beb5', borderRadius: 8, padding: '8px 10px'}}>{stage}/7</span>
      : <span className="explorer-taste-icon" aria-hidden="true" style={{backgroundPosition: `${(stage - 1) * 25}% ${row}%`}}/>}
    <strong>{money(price)} <small>{priceNote}</small></strong>
  </div>;
}
