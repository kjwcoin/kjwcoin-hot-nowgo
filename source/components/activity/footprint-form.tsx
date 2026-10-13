'use client';
import {useState,useSyncExternalStore,type FormEvent} from 'react';
import {activityAction} from '@/lib/activity/client';
import {Button} from '@/components/ui/button';
export default function FootprintForm({onSaved}:{onSaved:()=>Promise<void>}){
 const search=useSyncExternalStore(()=>()=>{},()=>location.search,()=>''),params=new URLSearchParams(search),sourceId=params.get('sourceStore')||'',fromSource=/^[a-f0-9-]{36}$/.test(sourceId);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const form=event.currentTarget;const body=Object.fromEntries(new FormData(form));setBusy(true);setMessage('');try{await activityAction('footprint',body);await onSaved();setMessage('발자국을 내 계정에 저장했어요. 방문 인증과 EXP는 인증 조건을 충족하면 반영됩니다.')}catch(error){setMessage((error as Error).message)}finally{setBusy(false)}}
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return <details className="aw-panel aw-footprint-form"><summary>＋ 국내·해외 발자국 / 도전 기록 남기기</summary><form onSubmit={submit}>
 <div className="aw-form-row">{fromSource&&<input type="hidden" name="sourceStoreId" value={sourceId}/>}<label>다녀온 매장<input name="shop" required maxLength={100} defaultValue={params.get('shop')||''} readOnly={fromSource} placeholder="실제로 다녀온 매장 이름"/></label><label>방문 날짜<input name="date" type="date" required max={today} defaultValue={today}/></label></div>
 <div className="aw-form-row"><label>국가<select name="country" defaultValue="KR">{[['KR','대한민국'],['JP','일본'],['TW','대만'],['HK','홍콩'],['TH','태국'],['VN','베트남'],['SG','싱가포르'],['MY','말레이시아'],['ID','인도네시아'],['PH','필리핀'],['CN','중국'],['IN','인도'],['US','미국'],['CA','캐나다'],['MX','멕시코'],['GB','영국'],['FR','프랑스'],['DE','독일'],['IT','이탈리아'],['ES','스페인'],['AU','호주'],['NZ','뉴질랜드'],['BR','브라질'],['AE','아랍에미리트'],['TR','튀르키예'],['ZA','남아프리카공화국']].map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label><label>도시·지역<input name="region" maxLength={80} placeholder="서울, 오사카, 뉴욕…"/></label></div>
 <label>먹은 메뉴<input name="menu" maxLength={100} placeholder="기억에 남는 한 접시"/></label><label>한 입의 기억<textarea name="note" maxLength={1000} rows={3}/></label>
 <div className="aw-form-row"><label>도전 이름 (선택)<input name="challengeTitle" maxLength={100} placeholder="매운맛 도전, 제휴 매장 챌린지…"/></label><label>내 도전 결과<select name="challengeResult" defaultValue=""><option value="">도전 기록 없음</option><option value="attempted">도전했어요</option><option value="completed">완주했어요</option><option value="failed">다음에 다시 도전</option></select></label></div>
 <p className="aw-help">개인 기록은 바로 보관합니다. 제휴 도전의 공식 인증·휘장은 해당 행사 조건을 확인한 기록에만 지급됩니다.</p><Button disabled={busy}>{busy?'저장 중…':'내 발자국 남기기'}</Button>{message&&<p role="status">{message}</p>}
 </form></details>;
}
