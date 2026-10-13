'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {prepareReportPhoto} from '@/lib/prepare-report-photo';
import ReportCompletion from '@/components/report-completion';
import {readReportGrowth,type ReportReceipt} from '@/lib/report-growth';
import {api,ApiError} from '@/lib/client';
import {SOURCE_HEAT,SOURCE_FLAVORS,type SourceCommunityState} from '@/lib/source-community';
import type {PublicSourcedStore} from '@/lib/sourced-store';
import styles from './source-community.module.css';
export default function SourceCommunity({store,menuId,initialReport}:{store:PublicSourcedStore;menuId?:string;initialReport?:{menu:string;photoUrl:string|null}}){
 const initial=store.menus.find(menu=>menu.id===menuId)||store.menus[0];
 const [data,setData]=useState<SourceCommunityState|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loginRequired,setLoginRequired]=useState(false),[menu,setMenu]=useState(initialReport?.menu||initial?.name||''),[heat,setHeat]=useState(''),[flavor,setFlavor]=useState(''),[price,setPrice]=useState(''),[photo,setPhoto]=useState<File|null>(null),[consent,setConsent]=useState(false);
 const saving=useRef(false),[ownerOpen,setOwnerOpen]=useState(false),[status,setStatus]=useState(''),[observed,setObserved]=useState(false);
 const [completion,setCompletion]=useState<ReportReceipt|null>(null);
 useEffect(()=>{if(!initialReport?.photoUrl)return;let cancelled=false;void fetch(initialReport.photoUrl).then(response=>{if(!response.ok)throw Error('발자국 사진을 불러오지 못했어요. 다시 첨부해 주세요.');return response.blob()}).then(blob=>{if(!cancelled)setPhoto(new File([blob],'footprint.webp',{type:blob.type||'image/webp'}))}).catch(error=>{if(!cancelled)setMessage((error as Error).message)});return()=>{cancelled=true}},[initialReport?.photoUrl]);
 const returnTo='/p/'+encodeURIComponent(store.slug);
 useEffect(()=>{let cancelled=false;const refresh=()=>api<SourceCommunityState>('/api/source-community?storeId='+encodeURIComponent(store.id)).then(next=>{if(!cancelled){setData(next);setMessage('')}}).catch(error=>{if(!cancelled)setMessage(error instanceof Error?error.message:'집계를 확인하지 못했어요.')});void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},15000);window.addEventListener('hot-customer-change',refresh);return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('hot-customer-change',refresh)}},[store.id]);
 async function save(action:'taste'|'owner-request'|'status'){
  if(saving.current)return;saving.current=true;setBusy(true);setMessage('');setLoginRequired(false);
  try{const before=action==='taste'?await readReportGrowth('hot').catch(()=>null):null;let options:RequestInit;if(action==='taste'){if(!photo)throw Error('메뉴 사진을 선택해 주세요.');const form=new FormData();form.set('storeId',store.id);form.set('menu',menu);form.set('heat',heat);form.set('flavor',flavor);form.set('price',price);form.set('consent',String(consent));form.set('photo',await prepareReportPhoto(photo));options={method:'POST',body:form}}else options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeId:store.id,action,...(action==='status'?{status,observed}:{})})};const next=await api<SourceCommunityState>('/api/source-community',options);setData(next);if(action==='taste'&&next.awardedExp)setCompletion({id:store.id+':'+menu.toLowerCase(),previousXp:before?.xp??null});setMessage((action==='taste'?'메뉴 사진과 가격을 저장했어요.':action==='status'?'영업상태 신고를 저장했어요.':'점주 회원가입 요청을 저장했어요.')+(next.awardedExp?' +'+next.awardedExp+' EXP':action==='status'?' 고객 3명 이상 일치 후 보상이 반영됩니다.':action==='taste'?' 중복 제보 또는 일일 한도에 따라 추가 EXP는 없어요.':''));window.dispatchEvent(new Event('nowgo-activity-change'));window.dispatchEvent(new Event('nowgo:catalog-refresh'));if(action==='taste'){setConsent(false)}}catch(error){setMessage(error instanceof Error?error.message:'저장하지 못했어요. 다시 시도해 주세요.');if(error instanceof ApiError&&error.status===401)setLoginRequired(true)}finally{saving.current=false;setBusy(false)}
 }
 function submit(event:FormEvent){event.preventDefault();void save('taste')}
 const count=data?.ownerRequests,axis=Math.max(10,Math.ceil((count||0)/10)*10);
 const statuses:Record<string,string>={open:'영업중',closed_for_day:'영업마감',regular_closed:'정기휴무',temporary_closed:'임시휴무',ingredients_soldout:'재료소진 마감',permanent_closed:'폐업'};
 return <>
  {completion&&<ReportCompletion variant="hot" receipt={completion} onClose={()=>setCompletion(null)}/>}
  <section className={styles.section} aria-label="매장 영업상태 신고"><h3>지금 매장 상태 알려주기</h3>{data?.statuses?.map(report=><p key={report.status} className={styles.statusBadge}><strong>고객 제보 · {statuses[report.status]}</strong><br/>{report.count}명 신고 · {report.confirmed?'3명 이상 일치':'확인 중'}<small>제보 {new Date(report.reportedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'})} · 점주 확인 정보와 구분</small></p>)}<form className={styles.form} onSubmit={event=>{event.preventDefault();void save('status')}}><label>영업상태<select required value={status} onChange={event=>setStatus(event.target.value)}><option value="">직접 확인한 상태 선택</option>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className={styles.consent}><input type="checkbox" required checked={observed} onChange={event=>setObserved(event.target.checked)}/><span>현재 매장 상태를 직접 확인했습니다.</span></label><button className={styles.button} type="submit" disabled={busy}>영업상태 신고하기</button><small>정상 제보 50 EXP · 영업상태 신고는 서로 다른 고객 3명 이상 일치 후 지급합니다. 같은 매장 상태는 하루 1회 보상합니다. 영업중·영업마감·정기휴무·임시휴무·재료소진 제보는 2시간, 폐업 제보는 24시간 표시됩니다.</small></form></section>
  <section className={styles.section} aria-label="메뉴별 맛 제보">
   <h3>메뉴 사진 · 가격 제보</h3>
   <p>직접 먹어본 메뉴 이름·사진·가격을 올려 주세요.</p>
   {data&&data.menus.length>0&&<div className={styles.summaries}>{data.menus.map(summary=><article key={summary.menu}><strong>{summary.menu}</strong>{summary.photoUrl&&<img className={styles.menuPhoto} src={summary.photoUrl} alt={summary.menu+' 고객 제보 사진'}/>}<span>{summary.price!=null?summary.price.toLocaleString('ko-KR')+'원 · 최근 고객 제보 가격':'가격 제보 대기'}</span><span>맵기 중앙값 {summary.heat}단계 · {summary.flavor}</span><small>고객 {summary.count}명 제보</small></article>)}</div>}
   <form onSubmit={submit} className={styles.form}>
    <label>메뉴 이름<input list={'source-menus-'+store.id} value={menu} onChange={event=>setMenu(event.target.value)} required maxLength={100} placeholder="직접 먹어본 메뉴 이름"/><datalist id={'source-menus-'+store.id}>{Array.from(new Set([...store.menus.map(item=>item.name),...(data?.menus.map(item=>item.menu)||[])])).map(name=><option value={name} key={name}/>)}</datalist></label>
    <div className={styles.fields}><label>맛 단계<select required value={heat} onChange={event=>setHeat(event.target.value)}><option value="">맵기 선택</option>{SOURCE_HEAT.map((label,index)=><option key={label} value={index+1}>{index+1}단계 · {label}</option>)}</select></label><label>매운맛 카테고리<select required value={flavor} onChange={event=>setFlavor(event.target.value)}><option value="">맛의 결 선택</option>{SOURCE_FLAVORS.map(label=><option key={label}>{label}</option>)}</select></label></div>
    <label>메뉴 사진{initialReport?.photoUrl&&photo&&<><img className={styles.menuPhoto} src={initialReport.photoUrl} alt="내 발자국에서 가져온 사진"/><small>발자국 사진을 가져왔어요. 다른 사진으로 교체할 수 있어요.</small></>}<input type="file" accept="image/jpeg,image/png,image/webp" required={!photo} onChange={event=>setPhoto(event.target.files?.[0]||null)}/><small>원본 사진 용량 제한 없이 선택할 수 있어요. 전송할 때 자동으로 최적화합니다.</small></label><label>가격 (원)<input type="number" inputMode="numeric" min="0" max="10000000" step="1" required value={price} onChange={event=>setPrice(event.target.value)} placeholder="직접 확인한 메뉴 가격"/></label>
    <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} required/><span>직접 먹어본 메뉴이며 직접 찍은 사진·메뉴명·가격·맵기·맛의 결 공개에 동의합니다.</span></label>
    <button className={styles.button} disabled={busy} type="submit">{busy?'저장 중…':'메뉴 사진·가격 올리기'}</button>
    <small>정상 제보 완료 시 50 EXP · 하루 총 100 EXP 한도 · 같은 메뉴의 재수정은 중복 지급하지 않습니다. 회원별 같은 메뉴의 최신 제보 1건을 집계합니다. 사진과 가격은 고객 제보이며 점주의 공식 메뉴 정보와 구분합니다.</small>
   </form>
  </section>
  <section className={styles.section} id="owner-information" aria-label="점주 회원가입 요청">
   <p>이 가게의 영업정보를 점주에게 확인받고 싶나요?</p>
   <button type="button" className={styles.button} aria-expanded={ownerOpen} onClick={()=>setOwnerOpen(!ownerOpen)}>＋ 점주 영업정보 요청</button>
   {ownerOpen&&<div className={styles.ownerBody}><button type="button" className={styles.button} disabled={busy||data?.requested||!data} onClick={()=>void save('owner-request')}>{data?.requested?'✓ 점주 회원가입 요청 완료':'점주 회원가입 요청'}</button><small>회원 1명당 이 매장에 1회만 누적됩니다.</small></div>}
   <div className={styles.count}><strong>점주 가입 요청 누적</strong><b>{count===undefined?'확인 중':count.toLocaleString('ko-KR')+'명'}</b></div>
   {count!==undefined&&<div role="img" aria-label={`점주 회원가입 누적 요청 ${count}명. 가로 막대 축 0부터 ${axis}명.`}><div className={styles.bar}><span style={{width:count/axis*100+'%'}}/></div><div className={styles.axis}><span>0명</span><span>{axis}명</span></div></div>}
   <a className={styles.ownerLink} href={'/owner/signup?sourceStore='+encodeURIComponent(store.id)}>이 매장의 점주이신가요? 통합회원 점주 가입 ↗</a>
   <small>월 8,000원 · 가입 시 대표메뉴 변경 가능</small>
  </section>
  <a className={styles.ownerLink} href="/exp-policy">EXP·레벨 정책 전체 보기 ↗</a>
  {message&&<p className={styles.message} role="status">{message}</p>}
  {loginRequired&&<a className={styles.ownerLink} href={'/account/join?type=user&returnTo='+encodeURIComponent(returnTo)}>통합회원 로그인하고 돌아오기 ↗</a>}
 </>;
}
