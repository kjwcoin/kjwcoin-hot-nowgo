import {medianPepperFills} from './hot-menu-heat.ts';
import type {PreviewMenuHeat} from './preview-menu-heat.ts';
import {sourcedStoreUrl,type PublicSourcedStore} from './sourced-store.ts';
/** Trust comes only from the validated public feed's explicit claim state. */
export function sourcedStoreMarker(store:PublicSourcedStore,dom:Pick<Document,'createElement'>=document):HTMLAnchorElement{
 const verified=store.ownerClaimVerified===true&&store.ownership==='verified'&&store.pinStatus==='owner-verified';
 const sourceOnly=store.registrationState==='source-only';
 const ownership=verified?'점주 확인':sourceOnly?'점주 확인 전':'점주 미등록';
 const publication=sourceOnly?'공공자료 소개':'공공자료 등록';
 const link=dom.createElement('a');
 link.className='map-anchor map-anchor--sourced'+(verified?' map-anchor--sourced-verified':'');
 link.href=sourcedStoreUrl(store);link.target='_blank';link.rel='noopener noreferrer';
 link.title=`${store.name} · ${publication} · ${ownership}`;
 link.setAttribute('aria-label',`${store.name}. ${publication}, ${ownership}. 가격, 매운맛 단계, 영업 여부 미확인. 매장 미니홈피 보기`);
 const pin=dom.createElement('span');pin.className='map-source-pin';pin.setAttribute('aria-hidden','true');
 const label=dom.createElement('span');label.className='map-source-label';label.textContent=store.name+' · '+ownership;
 link.append(pin,label);return link;
}

/** Keep the canonical link available; ordinary activation opens the existing map panel. */
export function bindSourceMarkerSelection(link:HTMLAnchorElement,store:PublicSourcedStore,onSelect?:((store:PublicSourcedStore)=>void),selected=false):void{
 if(selected){link.className+=' selected';link.setAttribute('aria-current','true')}
 if(!onSelect)return;
 link.removeAttribute('target');
 link.onclick=event=>{
  // Modified clicks intentionally retain the direct, shareable mini-home URL.
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();onSelect(store);
 };
}

/** A visibly local preview annotation. It never changes the ownership pin class. */
export function appendPreviewMarkerHeat(link:HTMLAnchorElement,store:PublicSourcedStore,summary:PreviewMenuHeat|undefined,dom:Pick<Document,'createElement'|'createElementNS'>=document):void{
 if(!summary||summary.scope!=='preview-local'||summary.storeId!==store.id||!store.menus.some(menu=>menu.id===summary.menuId)||summary.medianHeat===null)return;
 if(summary.sampleCount!==1||summary.myHeat!==summary.medianHeat||!Number.isInteger(summary.medianHeat)||summary.medianHeat<1||summary.medianHeat>5)return;
 const note=dom.createElement('span');note.className='map-preview-heat';
 const title=dom.createElement('small');title.textContent='미리보기 · '+summary.menuName;
 const icons=dom.createElement('span');icons.className='median-peppers';icons.setAttribute('aria-hidden','true');
 for(const fill of medianPepperFills(summary.medianHeat)){
  const frame=dom.createElement('span');frame.className='median-pepper';
  const pepper=()=>{const svg=dom.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','currentColor');svg.setAttribute('width','20');svg.setAttribute('height','20');const path=dom.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M19 3c-2 0-3 1-3 3l2 1c0-1 0-2 2-2z M16 6c-3-1-5 1-5 4-1 5-4 8-9 10 7 1 16-4 18-10 1-2-1-4-4-4z');svg.append(path);return svg};
  const filled=dom.createElement('span');filled.className='median-pepper-fill';filled.style.width=`${fill*100}%`;filled.append(pepper());frame.append(pepper(),filled);icons.append(frame);
 }
 const value=dom.createElement('small');value.textContent=`중앙값 ${summary.medianHeat}/5 · 내 입력 1건`;
 note.append(title,icons,value);link.append(note);
 const label=link.getAttribute('aria-label')||store.name;link.setAttribute('aria-label',label+`. ${summary.menuName} 미리보기 맵기 중앙값 ${summary.medianHeat}/5. 실제 고객 평가 아님.`);
}
