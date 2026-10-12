'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client';
import {createStoreOwnerRequestController,initialStoreOwnerRequestView} from '@/lib/store-owner-request-client';
import {returnPath} from '@/lib/integration-policy';
import styles from './owner-join-request.module.css';

export default function StoreOwnerJoinRequest({storeId,returnTo}:{storeId:string;returnTo:string}){
 return <StoreOwnerJoinRequestContent key={storeId} storeId={storeId} returnTo={returnTo}/>;
}
function StoreOwnerJoinRequestContent({storeId,returnTo}:{storeId:string;returnTo:string}){
 const [state,setState]=useState(initialStoreOwnerRequestView);
 const controller=useRef<ReturnType<typeof createStoreOwnerRequestController>|null>(null);
 useEffect(()=>{
  const flow=createStoreOwnerRequestController({storeId,request:api,onState:setState,onSaved:()=>window.dispatchEvent(new Event('nowgo-owner-join-request'))});
  controller.current=flow;void flow.load();
  const refresh=()=>{if(!document.hidden)void flow.load()},authChanged=()=>flow.authChanged();
  window.addEventListener('focus',refresh);window.addEventListener('nowgo-owner-join-request',refresh);window.addEventListener('hot-customer-change',authChanged);
  return()=>{flow.dispose();controller.current=null;window.removeEventListener('focus',refresh);window.removeEventListener('nowgo-owner-join-request',refresh);window.removeEventListener('hot-customer-change',authChanged)};
 },[storeId]);
 if(state.data?.ownerRegistered)return <p role="status">점주 등록이 확인됐어요. 최신 매장 정보를 다시 확인해 주세요.</p>;
 return <section id="owner-information" className={styles.sticker} aria-label="점주 영업정보 요청">
  <p>이 가게의 영업정보를 점주에게 확인받고 싶나요?</p>
  <button type="button" className={styles.button} disabled={state.busy||state.data?.requested} aria-pressed={state.data?.requested===true} onClick={()=>void controller.current?.submit()}>
   {state.busy?'요청 저장 중…':state.data?.requested?'✓ 점주 영업정보 요청 완료':'＋ 점주 영업정보 요청'}
   {state.data&&<span>{state.data.count.toLocaleString('ko-KR')}명</span>}
  </button>
  <small>회원 1명당 매장별 1회 집계합니다. 영업정보 요청 수는 메뉴 매운맛 평가 수와 별개예요.</small>
  {state.message&&<p role="status">{state.message}</p>}
  {state.loginRequired&&<div><a className={styles.login} href={'/account/join?type=user&returnTo='+encodeURIComponent(returnPath(returnTo))}>로그인하고 돌아오기 ↗</a>{' '}<button className={styles.login} type="button" onClick={()=>controller.current?.cancelLogin()}>취소</button><small>로그인 후 이 매장에서 요청 버튼을 다시 눌러 주세요.</small></div>}
 </section>;
}
