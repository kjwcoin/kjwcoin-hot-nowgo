'use client';
import {CalendarClock,Navigation,UsersRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import ConsumerMenuHeat from '@/components/consumer-menu-heat';
import PreviewMenuHeat,{type PreviewHeatSummary} from '@/components/preview-menu-heat';
import PreviewPhotoReport from '@/components/preview-photo-report';
import PreviewRegularControls from '@/components/preview-regular-controls';
import PreviewStoreInformation from '@/components/preview-store-information';
import RegularFavorite from '@/components/regular-favorite';
import RegularHomeLink from '@/components/regular-home-link';
import SourceAccountCharacter from '@/components/source-account-character';
import SourceReadonlyActions from '@/components/source-readonly-actions';
import SourcedStorePhoto,{type SourcePreviewPhoto} from '@/components/sourced-store-photo';
import SourcePreviewActions from '@/components/source-preview-actions';
import StoreOwnerJoinRequest from '@/components/store-owner-join-request';
import {BRAND_COMMON_MENU_NOTICE,isBrandCommonMenu,sourcedStoreClaimPath,type PublicSourcedStore} from '@/lib/sourced-store';
import {sourceFactsNotice} from '@/lib/store-discovery';
import ownerStyles from './owner-join-request.module.css';

type Props={store:PublicSourcedStore;preview?:boolean;menuId?:string|null;onBack:()=>void;previewHeat?:PreviewHeatSummary;onPreviewHeat?:(menuId:string,heat:number)=>void;onPreviewHeatReset?:()=>void;previewPhoto?:SourcePreviewPhoto;onPreviewPhoto?:(menuId:string,file:File,nickname:string)=>void;onPreviewPhotoReset?:()=>void;previewFavorite?:boolean;onPreviewFavoriteToggle?:()=>void};
/** Reuse the legacy HOT panel while isolating public-only facts from store-backed actions. */
export default function SourcedStoreDetail({store,preview=false,menuId,onBack,previewHeat,onPreviewHeat,onPreviewHeatReset,previewPhoto,onPreviewPhoto,onPreviewPhotoReset,previewFavorite,onPreviewFavoriteToggle}:Props){
 const menu=store.menus.find(item=>item.id===menuId)||store.menus[0];
 const brandCommon=menu?isBrandCommonMenu(menu):false;
 const sourceOnly=!preview&&store.registrationState==='source-only';
 const path='/p/'+encodeURIComponent(store.slug);
 const directions=store.coordinates?'https://map.kakao.com/link/to/'+encodeURIComponent(store.name)+','+store.coordinates.lat+','+store.coordinates.lon:null;
 return <article className="explorer-selected source-store-detail" data-store-id={store.id} data-preview={preview?'true':undefined} data-registration-state={sourceOnly?'source-only':undefined}>
  <Button variant="ghost" className="explorer-back" onClick={onBack}>← 메뉴 목록</Button>
  <SourcedStorePhoto detail previewPhoto={preview?previewPhoto:undefined}/>
  <div className="explorer-detail-content">
   <span className="explorer-tags">{store.name} · {sourceOnly?'공공자료 소개 · 점주 확인 전':store.ownerClaimVerified?'점주 확인':'점주 미등록'}</span>
   <h1>{menu?.name||store.name}</h1>
   {brandCommon&&<p className="source-action-note source-menu-scope">{BRAND_COMMON_MENU_NOTICE}</p>}
   {menu?.provenance?.preparationNotice&&<p className="source-action-note source-menu-preparation">{menu.provenance.preparationNotice}</p>}
   <div className="explorer-taste-price" aria-label="맵기 미확인, 가격 미확인">
    <span className="explorer-taste-icon source-taste-unknown"><span aria-hidden="true">?</span><small>맵기 미확인</small></span>
    <strong>가격 미확인</strong>
   </div>
   <p>{store.address}</p>
   {menu?.provenance&&!brandCommon&&<p className="source-action-note">공식 관광자료 기재 메뉴 · 현재 판매 여부 미확인{menu.provenance.nameRepresentation==='ja-transliteration'&&<><br/>일본어 메뉴명 한글 음역 · 현행 한국어 메뉴판 표기 미확인</>}</p>}
   <section className="store-status" aria-label="공공자료 매장 영업현황">
    <strong>{sourceOnly?'공공자료 소개 · 점주 확인 전':store.ownerClaimVerified?'점주 확인 · 공공자료 메뉴':'공공자료 등록 · 점주 미등록'}</strong>
    <p>영업현황 미확인<br/>현재 메뉴 제공 여부 미확인</p>
   </section>
   {preview?<PreviewRegularControls store={store} saved={previewFavorite||false} onToggle={onPreviewFavoriteToggle}/>:sourceOnly?<><SourceReadonlyActions key={'favorite:'+store.id} kind="favorite"><RegularHomeLink variant="hot" className="text-link">내 단골 목록</RegularHomeLink></SourceReadonlyActions><SourceAccountCharacter returnTo={path} readOnly/></>:<RegularFavorite placeId={'nowgo-'+store.id} slug={store.slug}/>}
   <div className="explorer-quick-actions source-quick-actions" aria-label="매장 이용 정보">
    {directions?<a className="explorer-action explorer-action--primary source-direction" href={directions} target="_blank" rel="noopener noreferrer"><Navigation size={18}/><span>길찾기</span></a>:<button type="button" className="explorer-action" disabled title="공공자료의 지도 위치가 확인되지 않았어요."><Navigation size={18}/><span>길찾기</span></button>}
    <button type="button" className="explorer-action" disabled title="점주의 예약 서비스 등록이 확인되지 않았어요."><CalendarClock size={18}/><span>예약하기</span></button>
    <button type="button" className="explorer-action" disabled title="점주의 웨이팅 서비스 등록이 확인되지 않았어요."><UsersRound size={18}/><span>웨이팅수 보기</span></button>
   </div>
   <p className="source-action-note">예약·웨이팅 정보 미확인 · 점주 확인 후 이용 가능{!directions?' · 지도 위치 미확인':''}</p>
   {preview?<PreviewMenuHeat key={store.id+':'+menu?.id} storeId={store.id} menus={store.menus} menuId={menu?.id} summary={previewHeat} onPreviewHeat={onPreviewHeat} onPreviewHeatReset={onPreviewHeatReset}/>:sourceOnly?<section className="source-public-taste" aria-label="메뉴별 맵기 안내"><h3>메뉴별 맵기 안내</h3><p>맵기는 같은 메뉴를 먹은 분들이 제보한 맵기 단계의 중앙값으로 정해집니다.</p><small>이 메뉴의 맵기와 제보 수는 미확인입니다. 메뉴별 제보 등록·집계는 아직 연결되지 않았어요.</small></section>:<><ConsumerMenuHeat storeId={store.id} menus={store.menus} reportingState={store.reportingState}/><button className="source-heat-pending" type="button" disabled title="실제 메뉴별 맵기 제보 등록은 아직 연결되지 않았어요.">먹어본 메뉴 맵기 제보</button></>}
   {preview&&<><PreviewPhotoReport key={'photo:'+store.id+':'+menu?.id} store={store} selectedMenuId={menu?.id} onPreviewPhoto={onPreviewPhoto} onReset={onPreviewPhotoReset}/><PreviewStoreInformation/></>}
   <footer className="source-detail-footer">
    {preview?<SourcePreviewActions/>:sourceOnly?<><SourceReadonlyActions key={'report:'+store.id+':'+menu?.id} kind="report"/><SourceReadonlyActions key={'owner:'+store.id} kind="owner"/></>:<>{!store.ownerClaimVerified&&<><StoreOwnerJoinRequest storeId={store.id} returnTo={path+'#owner-information'}/><a className={ownerStyles.login} href={sourcedStoreClaimPath(store.id)}>이 매장의 점주이신가요? 소유권 확인하기 ↗</a></>}</>}
    <details className="source-detail-attribution"><summary>공공자료 출처 · 확인 범위</summary><p>{sourceFactsNotice(store)}</p><a href={store.source.url} target="_blank" rel="noopener noreferrer">{store.source.fieldProvenance?'상호·주소 공공 CSV 원문 ↗':'공공데이터포털 원문 ↗'}</a><small>{store.source.fieldProvenance?`상호·주소·좌표 공공 CSV에만 적용: ${store.source.licenseName}`:store.source.licenseName}</small>{store.source.fieldProvenance&&<><a href={store.source.fieldProvenance.coordinates.url} target="_blank" rel="noopener noreferrer">좌표 공공 CSV 원문 ↗</a><small>좌표 원천 ID: {store.source.fieldProvenance.coordinates.nativeRecordId}</small></>}{menu?.provenance&&<><a href={menu.provenance.sourceUrl} target="_blank" rel="noopener noreferrer">{brandCommon?'브랜드 공식 메뉴 출처 ↗':'공식 관광자료 메뉴 출처 ↗'}</a><small>메뉴 자료 기준일 {menu.provenance.sourceAsOf||'미제공'} · 출처 확인일 {new Date(menu.provenance.checkedAt).toISOString().slice(0,10)} (UTC)</small><small>메뉴명 한 항목의 개별 사실 검토 · {brandCommon?'브랜드':'관광'} 웹페이지의 명시적 오픈 라이선스는 확인되지 않았습니다.</small><small>{brandCommon?'브랜드 공통 메뉴이며 이 지점의 판매 여부는 확인되지 않았습니다.':'공식 관광자료에 기재된 메뉴입니다. 현재 판매 여부는 확인이 필요합니다.'} 메뉴명의 표현은 고객이 평가한 맵기 단계가 아닙니다.</small>{menu.provenance.nameRepresentation==='ja-transliteration'&&<small>일본어 원문 메뉴명: {menu.provenance.originalName} · 한글 음역이며 현행 한국어 메뉴판 표기는 확인되지 않았습니다.</small>}</>}<small>{store.coordinates?`자료 속 위치: 위도 ${store.coordinates.lat} · 경도 ${store.coordinates.lon}`:'지도 위치 미확인'}</small><small>공공자료는 점주의 직접 등록이나 현재 영업을 뜻하지 않습니다.</small></details>
   </footer>
  </div>
 </article>;
}
