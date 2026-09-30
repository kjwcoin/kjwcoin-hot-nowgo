import type { Metadata } from 'next';
import { socialMetadata } from './social-preview';
import { type SiteVariant, variantForHost } from './site-config';

export const flavorOrigins = { hot: 'https://hot.nowgo.space', sweet: 'https://sweet.nowgo.space', rich: 'https://rich.nowgo.space' } as const;
export const flavorSearch = {
 hot: { title: '나우고 HOT | 지역별 매운맛 메뉴·맛집 지도', description: '지역과 상호로 매운맛 메뉴를 찾아보세요. 떡볶이·닭발·얼큰한 음식의 맵기와 가격, 점주·고객 제보를 지도에서 확인하고 매장 미니홈피로 연결합니다.' },
 sweet: { title: '나우고 SWEET | 지역별 디저트·카페 지도', description: '지역과 상호로 달콤한 디저트와 카페를 찾아보세요. 케이크·베이커리·아이스크림의 단맛과 가격, 점주·고객 제보를 지도에서 확인하고 매장 미니홈피로 연결합니다.' },
 rich: { title: '나우고 RICH | 지역별 크림·치즈·버터 메뉴 지도', description: '지역과 상호로 진하고 고소한 메뉴를 찾아보세요. 크림 파스타·치즈·버터 메뉴의 취향과 가격, 점주·고객 제보를 지도에서 확인하고 매장 미니홈피로 연결합니다.' },
} as const;

export function publicFlavorHost(host: string | null) {
 return /^(hot|sweet|rich)\.nowgo\.space(?::443)?$/i.test(host || '');
}

export function flavorPageMetadata(host: string | null, path: '/' | '/suggestion'): Metadata {
 const variant = variantForHost(host), copy = flavorSearch[variant], social = socialMetadata(variant);
 const title = path === '/' ? copy.title : `메뉴·매장 제보 | 나우고 ${variant.toUpperCase()}`;
 const description = path === '/' ? copy.description : `나우고 ${variant.toUpperCase()}에 지역·상호·메뉴·가격·사진을 제보하세요. 점주가 등록한 매장 정보와 고객 제보를 통해 방문 전 정보를 확인합니다.`;
 const url = `${flavorOrigins[variant]}${path}`;
 return { ...social, title, description, alternates: { canonical: url },
  robots: { index: publicFlavorHost(host), follow: true, 'max-image-preview': 'large' },
  // Keep the approved social artwork and home sharing copy.
  openGraph: { ...social.openGraph, url, ...(path === '/' ? {} : { title, description }) },
  twitter: { ...social.twitter, ...(path === '/' ? {} : { title, description }) },
 };
}

export function flavorWebsite(variant: SiteVariant) {
 const url = `${flavorOrigins[variant]}/`;
 return { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${url}#website`, url,
  name: `나우고 ${variant.toUpperCase()}`, alternateName: `NOWGO ${variant.toUpperCase()}`,
  description: flavorSearch[variant].description, inLanguage: 'ko-KR',
  publisher: { '@type': 'Organization', name: 'NOWGO', url: 'https://nowgo.space' },
 };
}
