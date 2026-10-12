import FlavorHeader from '@/components/flavor-header';
import ConsumerMenuHeat from '@/components/consumer-menu-heat';
import StoreOwnerJoinRequest from '@/components/store-owner-join-request';
import SourcePreviewActions from '@/components/source-preview-actions';
import {sourcedStoreClaimPath,type PublicSourcedStore} from '@/lib/sourced-store';
import {sourceFactsNotice} from '@/lib/store-discovery';
import './sourced-store-minihome.css';

export default function SourcedStoreMinihome({store,preview=false}:{store:PublicSourcedStore;preview?:boolean}){
 const path='/p/'+encodeURIComponent(store.slug),mapPath=preview?'/preview/source-store':'/?q='+encodeURIComponent(store.name);
 return <><FlavorHeader/>{preview&&<aside className="source-preview-banner" role="note">화면 미리보기 · 공개 전 검토용입니다. 요청·점주 신청은 저장되지 않습니다.</aside>}
  <main className="source-minihome" data-store-id={store.id} data-preview={preview?'true':undefined}>
   <a className="source-minihome-back" href={mapPath}>← HOT 지도 목록으로</a>
   <header className="sourced-store-card source-minihome-heading"><div className="source-minihome-status"><span className="source-minihome-dot" aria-hidden="true"/>{store.ownerClaimVerified?'점주 권한 확인 · 공공자료 메뉴':'공공자료 등록 · 점주 미등록'}</div><h1>{store.name}</h1><p>{store.address}</p><p className="source-minihome-warning">현재 영업 여부와 메뉴 판매 여부는 확인되지 않았어요. 방문 전에 매장에 확인해 주세요.</p></header>
   <div className="source-minihome-columns"><section className="sourced-store-card source-minihome-menu" aria-labelledby="source-menu-title"><span className="eyebrow">PUBLIC SOURCE MENU</span><h2 id="source-menu-title">자료에 나온 메뉴</h2>
    <ul>{store.menus.map(menu=><li key={menu.id}><strong>{menu.name}</strong><span>가격 미확인 · 매운맛 단계 미확인 · 사진 미확인</span><small>현재 메뉴 제공 여부 미확인</small></li>)}</ul>
    <ConsumerMenuHeat storeId={store.id} menus={store.menus} reportingState={store.reportingState}/>
   </section><aside className="source-minihome-owner">
    {preview?<SourcePreviewActions/>:<>{!store.ownerClaimVerified&&<StoreOwnerJoinRequest storeId={store.id} returnTo={path+'#owner-information'}/>}<section className="sourced-store-card"><h2>점주 안내</h2>{store.ownerClaimVerified?<p>점주 권한이 확인된 매장입니다. 공공자료의 메뉴와 현재 영업정보는 별도로 확인해 주세요.</p>:<><p>내 매장이라면 사업자 증빙과 소유권 심사를 통해 매장 정보를 관리할 수 있어요.</p><a className="source-minihome-claim" href={sourcedStoreClaimPath(store.id)}>이 매장의 점주이신가요? 소유권 확인하기 ↗</a><small>신청만으로 공식 점주 표시가 적용되지는 않습니다.</small></>}</section></>}
   </aside></div>
   <section className="sourced-store-card source-minihome-source" aria-labelledby="source-facts-title"><h2 id="source-facts-title">자료 출처와 확인 범위</h2><p>{sourceFactsNotice(store)}</p><dl><div><dt>공공자료</dt><dd><a href={store.source.url} target="_blank" rel="noopener noreferrer">공공데이터포털 원문 ↗</a></dd></div><div><dt>이용 조건</dt><dd>{store.source.licenseName}</dd></div><div><dt>자료 속 위치</dt><dd>{store.coordinates?`위도 ${store.coordinates.lat} · 경도 ${store.coordinates.lon}`:'지도 위치 미확인'}</dd></div></dl><small>공공자료는 점주의 직접 등록이나 현재 영업을 뜻하지 않습니다. 가격·사진·고객 평가를 임의로 채우지 않았습니다.</small></section>
  </main></>;
}
