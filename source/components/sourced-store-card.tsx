import ConsumerMenuHeat from '@/components/consumer-menu-heat';
import {sourcedStoreUrl,type PublicSourcedStore} from '@/lib/sourced-store';
export default function SourcedStoreCard({store,showHeading=true,preview=false}:{store:PublicSourcedStore;showHeading?:boolean;preview?:boolean}){
 return <div className="sourced-store-card">
  <a href={preview?'/p/'+encodeURIComponent(store.slug)+'?preview=source':sourcedStoreUrl(store)} target={preview?undefined:'_blank'} rel="noopener noreferrer" className="sourced-store-link">
   {showHeading&&<strong>{store.name}</strong>}
   <span>{store.ownerClaimVerified?'점주 확인 · 공공자료 메뉴':'공공자료 등록 · 점주 미등록'}</span>
   <span>{store.address}</span>
   <span>자료에 나온 메뉴: {store.menus.map(menu=>menu.name).join(' · ')}</span>
   <small>공공자료 기준: 가격 · 매운맛 단계 · 사진 미확인</small>
   <small>영업 여부 · 현재 메뉴 제공 여부 미확인{!store.coordinates?' · 지도 위치 미확인':''}</small>
   <b>매장 미니홈피 보기 ↗</b>
  </a>
  <ConsumerMenuHeat storeId={store.id} menus={store.menus} reportingState={store.reportingState}/>
  <small className="sourced-store-attribution"><a href={store.source.url} target="_blank" rel="noopener noreferrer">공공자료 출처</a> · {store.source.licenseName}{store.source.asOf?' · 자료 기준 '+store.source.asOf:''}</small>
 </div>;
}
