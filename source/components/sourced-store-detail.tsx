'use client';
import {CalendarClock,Navigation,UsersRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import ConsumerMenuHeat from '@/components/consumer-menu-heat';
import RegularFavorite from '@/components/regular-favorite';
import SourcedStorePhoto from '@/components/sourced-store-photo';
import SourcePreviewActions from '@/components/source-preview-actions';
import StoreOwnerJoinRequest from '@/components/store-owner-join-request';
import {sourcedStoreClaimPath,type PublicSourcedStore} from '@/lib/sourced-store';
import {sourceFactsNotice} from '@/lib/store-discovery';
import favoriteStyles from './regular-favorite.module.css';
import ownerStyles from './owner-join-request.module.css';

type Props={store:PublicSourcedStore;preview?:boolean;menuId?:string|null;onBack:()=>void};
/** Same selected-panel structure as the legacy HOT menu detail. No demo actions. */
export default function SourcedStoreDetail({store,preview=false,menuId,onBack}:Props){
 const menu=store.menus.find(item=>item.id===menuId)||store.menus[0];
 const path='/p/'+encodeURIComponent(store.slug);
 const directions=store.coordinates?'https://map.kakao.com/link/to/'+encodeURIComponent(store.name)+','+store.coordinates.lat+','+store.coordinates.lon:null;
 return <article className="explorer-selected reporter-store source-store-detail" data-store-id={store.id} data-preview={preview?'true':undefined}>
  <Button variant="ghost" className="explorer-back" onClick={onBack}>← 메뉴 목록</Button>
  <SourcedStorePhoto name={store.name} detail/>
  <div className="explorer-detail-content">
   <span className="explorer-tags">{store.name} · {store.ownerClaimVerified?'점주 확인':'점주 미등록'}</span>
   <h1>{menu?.name||store.name}</h1>
   <div className="explorer-taste-price" aria-label="맵기 미확인, 가격 미확인">
    <span className="explorer-taste-icon source-taste-unknown"><span aria-hidden="true">?</span><small>맵기 미확인</small></span>
    <strong>가격 미확인</strong>
   </div>
   <p>{store.address}</p>
   <section className="store-status" aria-label="공공자료 매장 영업현황">
    <strong>{store.ownerClaimVerified?'점주 확인 · 공공자료 메뉴':'공공자료 등록 · 점주 미등록'}</strong>
    <p>영업현황 미확인<br/>현재 메뉴 제공 여부 미확인</p>
   </section>
   {preview?<section className={favoriteStyles.section} aria-label="나의 단골"><div className={favoriteStyles.actions}><button type="button" className={favoriteStyles.save} disabled>♡ 단골저장</button></div><p className="source-action-note">미리보기에서는 단골저장을 이용할 수 없어요.</p></section>:<RegularFavorite placeId={'nowgo-'+store.id} slug={store.slug}/>}
   <div className="explorer-quick-actions source-quick-actions" aria-label="매장 이용 정보">
    {directions?<a className="explorer-action explorer-action--primary source-direction" href={directions} target="_blank" rel="noopener noreferrer"><Navigation size={18}/><span>길찾기</span></a>:<button type="button" className="explorer-action" disabled title="공공자료의 지도 위치가 확인되지 않았어요."><Navigation size={18}/><span>길찾기</span></button>}
    <button type="button" className="explorer-action" disabled title="점주의 예약 서비스 등록이 확인되지 않았어요."><CalendarClock size={18}/><span>예약하기</span></button>
    <button type="button" className="explorer-action" disabled title="점주의 웨이팅 서비스 등록이 확인되지 않았어요."><UsersRound size={18}/><span>웨이팅수 보기</span></button>
   </div>
   <p className="source-action-note">예약·웨이팅 정보 미확인 · 점주 확인 후 이용 가능{!directions?' · 지도 위치 미확인':''}</p>
   <ConsumerMenuHeat storeId={store.id} menus={store.menus} reportingState={preview?'pending':store.reportingState}/>
   <footer className="source-detail-footer">
    {preview?<SourcePreviewActions/>:<>{!store.ownerClaimVerified&&<><StoreOwnerJoinRequest storeId={store.id} returnTo={path+'#owner-information'}/><a className={ownerStyles.login} href={sourcedStoreClaimPath(store.id)}>이 매장의 점주이신가요? 소유권 확인하기 ↗</a></>}</>}
    <details className="source-detail-attribution"><summary>공공자료 출처 · 확인 범위</summary><p>{sourceFactsNotice(store)}</p><a href={store.source.url} target="_blank" rel="noopener noreferrer">공공데이터포털 원문 ↗</a><small>{store.source.licenseName}</small><small>{store.coordinates?`자료 속 위치: 위도 ${store.coordinates.lat} · 경도 ${store.coordinates.lon}`:'지도 위치 미확인'}</small><small>공공자료는 점주의 직접 등록이나 현재 영업을 뜻하지 않습니다.</small></details>
   </footer>
  </div>
 </article>;
}
