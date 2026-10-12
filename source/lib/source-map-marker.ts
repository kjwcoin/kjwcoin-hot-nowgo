import {sourcedStoreUrl,type PublicSourcedStore} from './sourced-store.ts';
/** Trust comes only from the validated public feed's explicit claim state. */
export function sourcedStoreMarker(store:PublicSourcedStore,dom:Pick<Document,'createElement'>=document):HTMLAnchorElement{
 const verified=store.ownerClaimVerified===true&&store.ownership==='verified'&&store.pinStatus==='owner-verified';
 const ownership=verified?'점주 확인':'점주 미등록';
 const link=dom.createElement('a');
 link.className='map-anchor map-anchor--sourced'+(verified?' map-anchor--sourced-verified':'');
 link.href=sourcedStoreUrl(store);link.target='_blank';link.rel='noopener noreferrer';
 link.title=`${store.name} · 공공자료 등록 · ${ownership}`;
 link.setAttribute('aria-label',`${store.name}. 공공자료 등록, ${ownership}. 가격, 매운맛 단계, 영업 여부 미확인. 매장 미니홈피 보기`);
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
