import {FLAVORS,HEAT,MENUS,MENU_CATEGORIES,RICH_FLAVORS,RICH_HEAT,RICH_MENUS,RICH_MENU_CATEGORIES,SWEET_FLAVORS,SWEET_HEAT,SWEET_MENUS,SWEET_MENU_CATEGORIES} from './menus';

export type SiteVariant='hot'|'sweet'|'rich';
export function variantForHost(host:string|null|undefined):SiteVariant {
 const value=host||'';
 if(/^(sweet\.nowgo\.space|sweet\.localhost)(:\d+)?$/i.test(value))return 'sweet';
 return /^(rich\.nowgo\.space|rich\.localhost)(:\d+)?$/i.test(value)?'rich':'hot';
}
export function siteConfig(variant:SiteVariant){
 if(variant==='rich')return {
  name:'RICH',menus:RICH_MENUS,heat:RICH_HEAT,flavors:RICH_FLAVORS,categories:RICH_MENU_CATEGORIES,
  accent:'#8b6945',logo:'/images/nowgo-red.png',favicon:'/favicon-beige.png?v=nowgo-n-transparent-1',
  headline:'느끼함도 취향이다',intro:'버터 한 입부터 진한 치즈까지. 오늘 끌리는 고소한 한 접시를 찾아요.',
  search:'크림 파스타, 치즈 그라탱, 버터 소금빵',
  consent:'2026-10-01-rich-map-1900-v2',tables:{saves:'rich_menu_saves',reports:'rich_taste_observations',menus:'ng_map_rich_menu_catalog',consents:'rich_member_consents'},
  bucket:'rich-report-photos',publish:'rich_publish_report',
 } as const;
 if(variant==='sweet')return {
  name:'SWEET',menus:SWEET_MENUS,heat:SWEET_HEAT,flavors:SWEET_FLAVORS,categories:SWEET_MENU_CATEGORIES,
  accent:'#197f6c',logo:'/images/nowgo-red.png',favicon:'/favicon-mint.png?v=nowgo-n-transparent-1',
  headline:'달콤함도 취향이다',intro:'오늘 끌리는 달콤한 한 조각을 찾아요.',
  search:'말차 케이크, 버터 크루아상, 우유 젤라또',
  consent:'2026-10-01-sweet-map-1900-v2',tables:{saves:'sweet_menu_saves',reports:'sweet_taste_observations',menus:'ng_map_sweet_menu_catalog',consents:'sweet_member_consents'},
  bucket:'sweet-report-photos',publish:'sweet_publish_report',
 } as const;
 return {
  name:'HOT',menus:MENUS,heat:HEAT,flavors:FLAVORS,categories:MENU_CATEGORIES,
  accent:'#c93421',logo:'/images/nowgo-red.png',favicon:'/favicon-red.png?v=nowgo-n-transparent-1',
  headline:'맛잘알이 제보하는 핫한 맛부심',intro:'메뉴·맵기·한 끼 예산으로 전국의 매운 한 접시를 찾아요.',
  search:'닭발, 떡볶이, 얼큰 칼국수',
  consent:'2026-10-01-hot-map-1900-v2',tables:{saves:'hot_menu_saves',reports:'hot_taste_observations',menus:'ng_map_hot_menu_catalog',consents:'hot_member_consents'},
  bucket:'hot-report-photos',publish:'hot_publish_report',
 } as const;
}
