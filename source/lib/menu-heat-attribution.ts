import type {Menu} from './menus';
/** Individual declarations are never presented as a canonical customer aggregate. */
export function menuHeatAttribution(menu:Pick<Menu,'heat'|'isDemo'|'verifiedOwner'>):string{
 if(!Number.isInteger(menu.heat)||menu.heat<1||menu.heat>7)return '맵기 미확인 · 메뉴별 중앙값 미집계';
 if(menu.isDemo)return `예시 맵기 ${menu.heat}/7 · 소비자 중앙값 아님`;
 return `${menu.verifiedOwner?'점주 안내 맵기':'개별 제보 맵기'} ${menu.heat}/7 · 메뉴별 중앙값 미집계`;
}
