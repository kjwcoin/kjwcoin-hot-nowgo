import type { Metadata } from 'next';
import { socialMetadata } from './social-preview';
import type { Menu } from './menus';
import type { SiteVariant } from './site-config';
import { BRAND_COMMON_MENU_NOTICE, isBrandCommonMenu, sourcedStoreUrl, type PublicSourcedStore } from './sourced-store.ts';

export const HOT_DISCOVERY_ORIGIN = 'https://hot.nowgo.space';
/** Legacy catalog gate remains conservative until per-place NOINDEX proof is exposed.
 * Sourced stores now use their explicit per-store eligibility below. */
export const STORE_DISCOVERY_INDEXING_READY: boolean = false;
export function publicHotHost(host: string | null) {
  return /^hot\.nowgo\.space(?::443)?$/i.test(host || '');
}

/** These dates describe the source, never current opening/menu availability. */
export function sourceFactsNotice(store: PublicSourcedStore): string {
  if(store.sourceRef.startsWith('blog-source-'))return `블로그에 기재된 상호·주소·메뉴명입니다. 출처 수집일 ${store.source.checkedAt.slice(0,10)}. ${store.coordinates?'상호와 주소 또는 매장 전화번호가 일치하는 지도 위치를 연결했습니다.':'현재 지도 위치는 확인되지 않았습니다.'} 현재 영업, 메뉴 판매 여부, 가격과 맵기 단계는 확인되지 않았습니다.`;
  const fields=store.source.fieldProvenance;
  if(fields){
    const checkedDate=(value:string)=>new Date(value).toISOString().slice(0,10);
    const menu=store.menus[0]?.provenance;
    if(fields.registration===null&&fields.identity){
      if(!store.menus.length)return `확인된 메뉴 정보가 없습니다. 상호·주소 자료 기준일 ${fields.identity.asOf} · 좌표 자료 기준일 ${fields.coordinates.asOf}. 상호·주소 출처 확인일 ${checkedDate(fields.identity.checkedAt)} (UTC) · 좌표 출처 확인일 ${checkedDate(fields.coordinates.checkedAt)} (UTC). 출처 확인일은 영업 현황 확인일이 아닙니다. 가격·맵기·사진·현재 영업 및 메뉴 판매 여부는 확인되지 않았습니다.`;
      const scope=menu?.sourceScope==='brand_common'?BRAND_COMMON_MENU_NOTICE:'공식 관광자료 기재 메뉴 · 현재 판매 여부 미확인';
      const menuType=menu?.sourceScope==='brand_common'?'브랜드 공통':'관광자료';
      return `${scope}.${menu?.preparationNotice?' '+menu.preparationNotice:''} 상호·주소 자료 기준일 ${fields.identity.asOf} · 좌표 자료 기준일 ${fields.coordinates.asOf} · ${menuType} 메뉴 자료 기준일 ${menu?.sourceAsOf||'미제공'}. 상호·주소 출처 확인일 ${checkedDate(fields.identity.checkedAt)} (UTC) · 좌표 출처 확인일 ${checkedDate(fields.coordinates.checkedAt)} (UTC) · 메뉴 출처 확인일 ${menu?checkedDate(menu.checkedAt):'미제공'} (UTC). 출처 확인일은 영업·메뉴 현황 확인일이 아닙니다. 가격·맵기·사진·현재 영업 및 메뉴 판매 여부는 확인되지 않았습니다.`;
    }
    if(!fields.registration)throw Error('missing_source_identity');
    return `상호·주소 자료 기준일 ${fields.registration.asOf} · 좌표 자료 기준일 ${fields.coordinates.asOf} · 관광자료 메뉴 기준일 미제공. 상호·주소 출처 확인일 ${checkedDate(fields.registration.checkedAt)} (UTC) · 좌표 출처 확인일 ${checkedDate(fields.coordinates.checkedAt)} (UTC) · 메뉴 출처 확인일 ${menu?checkedDate(menu.checkedAt):'미제공'} (UTC). 출처 확인일은 영업·메뉴 현황 확인일이 아닙니다. 가격·맵기·사진·현재 영업 및 메뉴 판매 여부는 확인되지 않았습니다.`;
  }
  const asOf = store.source.asOf ? `자료 기준일 ${store.source.asOf}` : '자료 기준일 미제공';
  return `${asOf} · 출처 확인일 ${store.source.checkedAt.slice(0, 10)}. 출처 확인일은 영업·메뉴 현황 확인일이 아닙니다. 가격·맵기·사진·현재 영업 및 메뉴 판매 여부는 확인되지 않았습니다.`;
}

function pageMetadata(title: string, description: string, url: string, index: boolean, variant: SiteVariant = 'hot'): Metadata {
  const social = socialMetadata(variant);
  return {
    ...social,
    title, description, alternates: { canonical: url },
    robots: { index, follow: true, 'max-image-preview': 'large' },
    // Preserve approved brand artwork; never invent a store photo or rating.
    openGraph: { ...social.openGraph, type: 'website', locale: 'ko_KR', siteName: `NOWGO ${variant.toUpperCase()}`, title, description, url },
    twitter: { ...social.twitter, title, description },
  };
}

export function sourcedStoreMetadata(store: PublicSourcedStore, host: string | null = null): Metadata {
  const title = `${store.name} · ${store.address} | 나우고 HOT`;
  const menuScope=store.menus.some(isBrandCommonMenu)?`${BRAND_COMMON_MENU_NOTICE}:`:'공개자료에 기재된 메뉴:';
  const menuDescription=store.menus.length?`${menuScope} ${store.menus.slice(0, 3).map(menu => menu.name).join(', ')}.`:'확인된 메뉴 정보가 없습니다.';
  const description = `${store.address}의 ${store.name}. ${menuDescription} ${store.menus[0]?.provenance?.preparationNotice?store.menus[0].provenance.preparationNotice+' ':''}${store.ownerClaimVerified ? '점주 권한 확인 매장.' : '점주 미확인 매장.'} 현재 영업·가격·메뉴 판매 여부는 방문 전에 확인하세요.`;
  return pageMetadata(title, description, sourcedStoreUrl(store), store.indexable===true && publicHotHost(host));
}

export function sourcedStoreJsonLd(store: PublicSourcedStore) {
  const url = sourcedStoreUrl(store);
  // UUID and public source reference survive owner claims and display-name changes.
  const entityId = `${HOT_DISCOVERY_ORIGIN}/#store-${store.id}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: store.name, inLanguage: 'ko-KR',
        description: sourceFactsNotice(store), mainEntity: { '@id': entityId },
        isBasedOn: { '@type': 'CreativeWork', url: store.source.url, name: store.sourceRef.startsWith('blog-source-')?'블로그 출처':'공공데이터 출처' } },
      { '@type': 'Restaurant', '@id': entityId, url, name: store.name,
        identifier: [
          { '@type': 'PropertyValue', propertyID: 'NOWGO store UUID', value: store.id },
          { '@type': 'PropertyValue', propertyID: 'Public source record', value: store.sourceRef },
        ],
        address: { '@type': 'PostalAddress', streetAddress: store.address, addressCountry: 'KR' },
        ...(store.coordinates ? { geo: { '@type': 'GeoCoordinates', latitude: store.coordinates.lat, longitude: store.coordinates.lon } } : {}),
      },
    ],
  };
}

export function legacyStoreUrl(placeId: string, variant: SiteVariant = 'hot'): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(placeId)) throw Error('invalid_place_id');
  return `https://${variant}.nowgo.space/place/${encodeURIComponent(placeId)}`;
}

export function legacyStoreMetadata(menu: Menu, variant: SiteVariant, host: string | null): Metadata {
  const title = `${menu.shop} · ${menu.name} | 나우고 ${variant.toUpperCase()}`;
  const description = `${menu.area} ${menu.shop}의 ${menu.name}. ${menu.verifiedOwner ? '점주' : '고객'} 제보 정보이며 현재 영업·가격·메뉴 판매 여부는 방문 전에 확인하세요.`;
  return pageMetadata(title, description, legacyStoreUrl(menu.placeId, variant), STORE_DISCOVERY_INDEXING_READY && variant === 'hot' && publicHotHost(host) && !menu.isDemo, variant);
}

export function legacyStoreJsonLd(menu: Menu, variant: SiteVariant) {
  if (menu.isDemo || !menu.shop.trim() || !menu.area.trim()) return null;
  const url = legacyStoreUrl(menu.placeId, variant);
  // Do not infer locality from a name, owner registration from a gray pin, or ratings from reports.
  return { '@context': 'https://schema.org', '@type': 'Restaurant', '@id': `${url}#store`, url,
    name: menu.shop, identifier: menu.placeId,
    address: { '@type': 'PostalAddress', streetAddress: menu.area, addressCountry: 'KR' },
    description: `${menu.verifiedOwner ? '점주' : '고객'} 제보 정보. 현재 영업·메뉴 판매 여부는 확인이 필요합니다.`,
  };
}

/** Prevent an untrusted name from closing an inline JSON-LD script. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
