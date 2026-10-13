import {ArrowUpRight} from 'lucide-react';
import SourcedStorePhoto,{type SourcePreviewPhoto} from '@/components/sourced-store-photo';
import {BRAND_COMMON_MENU_NOTICE,isBrandCommonMenu,sourcedStoreUrl,type PublicSourcedStore} from '@/lib/sourced-store';

type Props={store:PublicSourcedStore;showHeading?:boolean;preview?:boolean;previewPhoto?:SourcePreviewPhoto;previewPhotoMenuId?:string;onSelect?:(store:PublicSourcedStore,menuId?:string)=>void};
/** Public facts use the original HOT menu row, without adapting nulls into Menu. */
export default function SourcedStoreCard({store,showHeading=true,preview=false,previewPhoto,previewPhotoMenuId,onSelect}:Props){
 const sourceOnly=!preview&&store.registrationState==='source-only';
 const status=sourceOnly?'공공자료 소개 · 점주 확인 전':store.ownerClaimVerified?'점주 확인 · 공공자료 메뉴':'공공자료 등록 · 점주 미등록';
 const identityContent=<><SourcedStorePhoto/><span className="explorer-item-copy"><small>공공자료 매장 정보</small><strong>확인된 메뉴 정보가 없어요</strong><span>{store.address}</span><small className="reporter-store-status">{status}</small>{!store.coordinates&&<small>지도 위치 미확인</small>}</span><ArrowUpRight size={17} aria-hidden="true"/></>;
 return <div className="source-store-legacy-card" data-store-id={store.id} data-registration-state={sourceOnly?'source-only':undefined}>
  {showHeading&&<header className="explorer-store-name"><strong>{store.name}</strong></header>}
  {!store.menus.length&&(onSelect?<button data-source-store-id={store.id} type="button" className="explorer-menu-item" aria-label={`${store.name} · 매장 정보 상세 보기`} onClick={()=>onSelect(store)}>{identityContent}</button>:<a data-source-store-id={store.id} className="explorer-menu-item" href={sourcedStoreUrl(store)}>{identityContent}</a>)}
  {store.menus.map(menu=>{
   const content=<><SourcedStorePhoto previewPhoto={preview&&previewPhotoMenuId===menu.id?previewPhoto:undefined}/><span className="explorer-item-copy"><small>맵기 미확인</small><strong>{menu.name}</strong>{isBrandCommonMenu(menu)&&<small className="source-menu-scope">{BRAND_COMMON_MENU_NOTICE}</small>}{menu.provenance?.preparationNotice&&<small className="source-menu-preparation">{menu.provenance.preparationNotice}</small>}<span>가격 미확인</span><small className="reporter-store-status">{status}</small>{!store.coordinates&&<small>지도 위치 미확인</small>}</span><ArrowUpRight size={17} aria-hidden="true"/></>;
   return onSelect?<button key={menu.id} data-source-menu-id={menu.id} type="button" className="explorer-menu-item" aria-label={`${store.name} · ${menu.name}${isBrandCommonMenu(menu)?' · '+BRAND_COMMON_MENU_NOTICE:''}${menu.provenance?.preparationNotice?' · '+menu.provenance.preparationNotice:''} 상세 보기`} onClick={()=>onSelect(store,menu.id)}>{content}</button>:<a key={menu.id} className="explorer-menu-item" href={preview?'/p/'+encodeURIComponent(store.slug)+'?preview=source':sourcedStoreUrl(store)}>{content}</a>;
  })}
 </div>;
}
