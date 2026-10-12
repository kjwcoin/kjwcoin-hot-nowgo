'use client';
import {useState} from 'react';
import styles from './owner-join-request.module.css';
/** Review-only UI. Intentionally has no API, auth, count or persistent storage. */
export default function SourcePreviewActions(){
 const [active,setActive]=useState<'request'|'claim'|null>(null);
 return <section className={styles.sticker} aria-label="미리보기 참여 안내">
  <p>이 가게의 영업정보를 점주에게 확인받고 싶나요?</p>
  <button className={styles.button} type="button" onClick={()=>setActive('request')}>＋ 점주 영업정보 요청</button>
  <small>영업정보 요청 수는 메뉴 매운맛 평가 수와 별개예요.</small>
  <button className={styles.login} type="button" onClick={()=>setActive('claim')}>이 매장의 점주이신가요? 소유권 확인하기 ↗</button>
  {active&&<div role="status" className="source-preview-explanation"><p>{active==='request'?'미리보기에서는 요청이 저장되지 않습니다. 실제 공개 후에는 로그인한 회원의 요청을 매장별 한 번만 집계합니다.':'미리보기에서는 점주 신청을 받지 않습니다. 실제 신청은 사업자 증빙과 매장 소유권 심사를 거치며, 승인 전에는 공식 점주로 표시되지 않습니다.'}</p><button type="button" className={styles.login} onClick={()=>setActive(null)}>닫기</button></div>}
 </section>;
}
