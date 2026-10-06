'use client';
import MapSubscriptionSettings from './owner/map-subscription-settings';

import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {api,ApiError} from '@/lib/client';
import {browserDb} from '@/lib/supabase-browser';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import {currentWaiting,fromKoreanInput,localKoreanInput,type OwnerSnapshot,type Appointment} from '@/lib/owner-management';
import styles from './owner-store-manager.module.css';
import OwnerOperationsPanel from './owner/owner-operations-panel';
import {MAP_SUBSCRIPTION_AMOUNT_KRW} from '@/lib/map-subscription';
const labels:Record<string,string>={pending:'예약 확인 중',confirmed:'예약 확정',waiting:'대기 중',called:'입장 호출',seated:'입장 완료'};
function time(iso:string){return new Date(iso).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}
export default function OwnerStoreManager({variant}:{variant:SiteVariant}){
 const theme=siteConfig(variant);
 const [snapshot,setSnapshot]=useState<OwnerSnapshot|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[needsLogin,setNeedsLogin]=useState(false),[failureCode,setFailureCode]=useState(''),[now,setNow]=useState(()=>new Date().toISOString());
 const sequence=useRef(0),mounted=useRef(true),storeRef=useRef(''),actionRunning=useRef(false),waitingForm=useRef<HTMLFormElement|null>(null),account=useRef<string|null>(null);
 
 const refresh=useCallback(async(store=storeRef.current)=>{
  const run=++sequence.current;
  try{const result=await api<OwnerSnapshot>('/api/owner/manage'+(store?`?storeId=${encodeURIComponent(store)}`:''));if(!mounted.current||run!==sequence.current)return;setSnapshot(result);setError('');setNeedsLogin(false);setFailureCode('');}
  catch(e){if(mounted.current&&run===sequence.current){setSnapshot(null);setError(e instanceof Error?e.message:'매장 관리 연결 실패');setNeedsLogin(e instanceof ApiError&&e.status===401);setFailureCode(e instanceof ApiError?e.code??'':'');}}
 },[]);
 useEffect(()=>{mounted.current=true;const {data:authListener}=browserDb().auth.onAuthStateChange((_event,session)=>{const id=session?.user&&!session.user.is_anonymous?session.user.id:null;if(account.current!==id){account.current=id;sequence.current++;setSnapshot(null);storeRef.current='';setTimeout(()=>{if(mounted.current)void refresh();},0);}});void refresh();const update=()=>{if(!document.hidden&&!actionRunning.current){setNow(new Date().toISOString());void refresh();}};const timer=setInterval(update,15000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);return()=>{mounted.current=false;sequence.current++;authListener.subscription.unsubscribe();clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};},[refresh]);
 const subscriptionActivated=useCallback(()=>{void refresh();},[refresh]);
 const state=snapshot?.state,storeId=snapshot?.storeId,store=snapshot?.stores.find(item=>item.id===storeId),enabled=Boolean(snapshot?.access.enabled&&state),settings=state?.settings;
 async function save(body:Record<string,unknown>|FormData){
  if(!enabled||!storeId||actionRunning.current)return;
  actionRunning.current=true;setBusy(true);setError('');setNotice('');
  try{const result=await api<{message?:string}>('/api/owner/manage',{method:'POST',...(body instanceof FormData?{body}:{headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,storeId})})});setNotice(result.message??'저장했습니다.');await refresh(storeId);setNow(new Date().toISOString());}
  catch(e){setError(e instanceof Error?e.message:'저장 실패');}
  finally{actionRunning.current=false;setBusy(false);}
 }
 const config={reservationsEnabled:settings?.reservations_enabled??false,waitingUntil:settings?.waiting_until??null,maxPartySize:settings?.max_party_size??8,maxWaitingTeams:settings?.max_waiting_teams??30};
 const todayWaiting=state?currentWaiting(state.appointments,now):[];
 async function featured(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!storeId)return;const form=new FormData(event.currentTarget);form.set('storeId',storeId);await save(form);}
 function submitSlot(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);try{void save({action:'slot',startsAt:fromKoreanInput(String(form.get('startsAt'))),capacity:Number(form.get('capacity')),enabled:true});}catch(e){setError((e as Error).message);}}
 function submitWaiting(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);try{void save({action:'configure',...config,waitingUntil:fromKoreanInput(String(form.get('until'))),maxWaitingTeams:Number(form.get('maxWaitingTeams'))});}catch(e){setError((e as Error).message);}}
 function appointment(item:Appointment){return <article key={item.id} className={styles.row}><strong>{item.guest_name||'방문 손님'} · {item.party_size}명{item.queue_position?` · 대기번호 ${item.queue_position}`:''}</strong><p>{labels[item.status]||item.status}{item.scheduled_at?` · ${time(item.scheduled_at)}`:''}</p><div className={styles.actions}>
  {item.status==='pending'&&<button disabled={busy} onClick={()=>void save({action:'transition',id:item.id,status:'confirmed'})}>예약 확정</button>}
  {item.status==='waiting'&&<button disabled={busy} onClick={()=>void save({action:'transition',id:item.id,status:'called'})}>입장 호출</button>}
  {item.status==='called'&&<button disabled={busy} onClick={()=>void save({action:'transition',id:item.id,status:'seated'})}>입장 완료</button>}
  {(item.status==='seated'||(item.status==='confirmed'&&item.scheduled_at&&Date.parse(item.scheduled_at)<=Date.parse(now)))&&<button disabled={busy} onClick={()=>void save({action:'transition',id:item.id,status:'completed'})}>이용 완료</button>}
  {['pending','confirmed','waiting','called'].includes(item.status)&&<button disabled={busy} onClick={()=>{if(window.confirm('이 접수를 취소할까요?'))void save({action:'transition',id:item.id,status:'cancelled'});}}>접수 취소</button>}
 </div></article>}
 if(error&&!snapshot)return <main className={styles.shell} style={{'--owner-accent':theme.accent} as CSSProperties}>
  <header className={styles.heading}><div><p className={styles.eyebrow}>{theme.name} · MY STORE</p><h1>내 매장관리</h1></div></header>
  <section className={styles.paywall}><h2>{needsLogin?'점주 계정으로 로그인해 주세요':failureCode==='owner_required'?'점주 매장 등록을 완료해 주세요':'매장 정보를 확인하지 못했어요'}</h2><p role="alert">{error}</p>
  {failureCode==='owner_required'&&<p>통합회원 로그인 후 점주 매장 등록과 소유권 확인이 필요합니다. 등록한 매장이 확인되면 월 1,900원 구독을 신청할 수 있습니다.</p>}
  <div className={styles.actions}>{needsLogin&&<Link className={styles.primaryLink} href="/account/join?type=owner&returnTo=%2Fowner">점주 통합계정 로그인</Link>}{failureCode==='owner_required'&&<a className={styles.primaryLink} href="https://nowgo.space/owner/signup">점주 매장 등록</a>}<button disabled={busy} onClick={()=>void refresh()}>다시 확인</button><Link className={styles.secondary} href="/">지도로 돌아가기</Link></div></section>
 </main>;
 if(snapshot&&!enabled)return <main className={styles.shell} style={{'--owner-accent':theme.accent} as CSSProperties}>
  <header className={styles.heading}><div><p className={styles.eyebrow}>{theme.name} · MY STORE</p><h1>내 매장관리</h1><p>{store?.name??'내 가게의 오늘을 관리하세요.'}</p></div>{snapshot.stores.length>1&&<label>관리할 매장<select value={storeId??''} disabled={busy} onChange={event=>{const id=event.target.value;storeRef.current=id;setSnapshot(null);setNotice('');void refresh(id);}}>{snapshot.stores.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</header>
  <section role="status" className={styles.paywall} aria-labelledby="owner-subscription-title">
   <p className={styles.eyebrow}>OWNER SUBSCRIPTION</p><h2 id="owner-subscription-title">구독 결제 후 이용할 수 있어요</h2>
   <p>{snapshot.access.message??'점주 구독 결제와 매장 소유권 확인이 필요합니다.'}</p>
   <strong>월 {MAP_SUBSCRIPTION_AMOUNT_KRW.toLocaleString('ko-KR')}원 <small>(VAT 포함)</small></strong>
   <p>결제가 확인되면 {theme.name} 내 매장관리의 영업 상태, 예약, 웨이팅, 대표메뉴 기능이 열립니다.</p>
   <MapSubscriptionSettings required={snapshot.access.code==='map_subscription_required'} onActivated={subscriptionActivated} ownerVerified={Boolean(snapshot&&(snapshot.access.enabled||snapshot.access.code==='map_subscription_required'))}/><div className={styles.actions}>{snapshot.access.code==='approval_required'&&<a className={styles.primaryLink} href="https://nowgo.space/owner/signup">점주 매장 등록·소유권 확인</a>}<Link className={styles.secondary} href="/">지도로 돌아가기</Link></div>
  </section>
 </main>;
 return <main className={styles.shell} style={{'--owner-accent':theme.accent} as CSSProperties}>
  <header className={styles.heading}><div><p className={styles.eyebrow}>{theme.name} · MY STORE</p><h1>내 매장관리</h1><p>{store?.name??'내 가게의 오늘을 관리하세요.'}<br/>영업 상태, 예약, 웨이팅, 대표메뉴를 한곳에서 관리합니다.</p></div>{snapshot&&snapshot.stores.length>1&&<label>관리할 매장<select value={storeId??''} disabled={busy} onChange={event=>{const id=event.target.value;storeRef.current=id;setSnapshot(null);setNotice('');void refresh(id);}}>{snapshot.stores.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</header>
  <nav className={styles.nav} aria-label="내 매장관리 기능">{[['today-status','오늘의 영업상태 설정'],['reservations','예약'],['waiting','웨이팅'],['featured-menu','대표메뉴 관리']].map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</nav>
  {error&&<p role="alert" className={`${styles.message} ${styles.error}`}>{error}</p>}{notice&&<p role="status" className={styles.message}>{notice}</p>}
  {needsLogin&&<div className={styles.actions}><Link href="/account/join?type=owner&returnTo=%2Fowner" className={styles.secondary}>점주 로그인</Link><button onClick={()=>void refresh()}>다시 확인</button></div>}
  {!snapshot&&!error&&<p className={styles.loading} role="status">내 매장 정보를 확인하고 있어요.</p>}
  {enabled&&!state?.featured&&<p className={styles.notice}>첫 매장 설정 · <a href="#featured-menu">대표메뉴 이름·사진·가격을 먼저 등록해 주세요.</a></p>}
  <div className={styles.grid}>
   <section id="today-status" className={styles.full}>{enabled&&<OwnerOperationsPanel selectedStoreId={storeId??undefined}/>}</section>
   <section id="reservations" className={styles.card}><h2>예약</h2><p className={styles.description}>예약 접수를 켜고 받을 시간과 정원을 등록하세요.</p><fieldset disabled={!enabled||busy}><label className={styles.toggle}><input type="checkbox" checked={config.reservationsEnabled} onChange={event=>void save({action:'configure',...config,reservationsEnabled:event.target.checked})}/>예약 접수 {config.reservationsEnabled?'켬':'끔'}</label><form onSubmit={submitSlot} className={styles.form}><label>예약 날짜·시간(한국 시간)<input name="startsAt" type="datetime-local" required/></label><label>예약 시간별 정원(명)<input name="capacity" type="number" min="1" max="500" defaultValue="8" required/></label><button className={styles.primary}>예약 시간 등록</button></form></fieldset><div className={styles.list}>{state?.slots.map(slot=><article key={slot.id} className={styles.row}><strong>{time(slot.starts_at)}</strong><p>정원 {slot.capacity}명 · {slot.enabled?'접수 가능':'접수 중지'}</p><button disabled={busy||!enabled} onClick={()=>void save({action:'slot',startsAt:slot.starts_at,capacity:slot.capacity,enabled:!slot.enabled})}>{slot.enabled?'이 시간 접수 닫기':'이 시간 접수 열기'}</button></article>)}</div><h3 className={styles.hint}>예약 내역</h3><div className={styles.list}>{state?.appointments.filter(item=>item.kind==='reservation').map(appointment)}{enabled&&!state?.appointments.some(item=>item.kind==='reservation')&&<p className={styles.description}>접수된 예약이 없습니다.</p>}</div></section>
   <section id="waiting" className={styles.card}><h2>웨이팅</h2><p className={styles.description}>오늘 받을 대기 팀과 접수 종료 시간을 정하세요.</p><p className={styles.metric}>{enabled&&state?.availability?state.availability.waitingCount:'—'}<small>팀 대기 중</small></p>{state?.availability.waitingBlocked&&<p className={styles.hint}>현재 영업 상태로 웨이팅 접수가 제한되어 있어요.</p>}<fieldset disabled={!enabled||busy}><label className={styles.toggle}><input type="checkbox" checked={Boolean(config.waitingUntil&&Date.parse(config.waitingUntil)>Date.parse(now))} onChange={event=>{if(!event.target.checked)void save({action:'configure',...config,waitingUntil:null});else {try{const form=waitingForm.current?new FormData(waitingForm.current):null;void save({action:'configure',...config,waitingUntil:fromKoreanInput(String(form?.get('until')??'')),maxWaitingTeams:Number(form?.get('maxWaitingTeams')??config.maxWaitingTeams)});}catch(e){setError((e as Error).message);}}}}/>웨이팅 접수 {config.waitingUntil&&Date.parse(config.waitingUntil)>Date.parse(now)?'켬':'끔'}</label><form ref={waitingForm} onSubmit={submitWaiting} className={styles.form}><label>오늘 접수 종료 시간(한국 시간)<input key={config.waitingUntil??'waiting'} name="until" type="datetime-local" defaultValue={config.waitingUntil?localKoreanInput(config.waitingUntil):`${localKoreanInput(now).slice(0,10)}T23:59`} required/></label><label>최대 대기 팀 수<input name="maxWaitingTeams" type="number" min="1" max="200" defaultValue={config.maxWaitingTeams} required/></label><button className={styles.primary}>웨이팅 접수 열기</button></form></fieldset><div className={styles.list}>{todayWaiting.map(appointment)}{enabled&&!todayWaiting.length&&<p className={styles.description}>오늘 대기 중인 팀이 없습니다.</p>}</div><p className={styles.hint}>운영·접수 정보는 15초마다 갱신됩니다.</p></section>
   <section id="featured-menu" className={`${styles.card} ${styles.full}`}><h2>대표메뉴 관리</h2><p className={styles.description}>처음에는 대표메뉴 이름·사진·가격을 등록해 주세요. 등록한 메뉴는 선택한 지도에 반영됩니다.</p>{state?.featured&&<div><Image unoptimized width={160} height={120} className={styles.photo} src={`https://nowgo.space${state.featured.imageUrl}`} alt={`${state.featured.name} 대표사진`}/><p>{state.featured.name} · {state.featured.priceText}</p></div>}<fieldset disabled={!enabled||busy}><form onSubmit={featured} className={styles.form}><div className={styles.two}><label>대표메뉴 이름<input key={`name:${storeId}:${state?.featured?.name}`} name="name" defaultValue={state?.featured?.name??''} maxLength={100} required/></label><label>가격(원)<input key={`price:${storeId}:${state?.featured?.priceText}`} name="price" defaultValue={state?.featured?.priceText??''} placeholder="예: 9,000원" maxLength={50} required/></label></div><label>대표메뉴 사진(JPG·PNG·WebP, 5MB 이하)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/></label><div className={styles.two}><label>등록할 지도<select name="planet" defaultValue={state?.featured?.planet??variant}><option value="hot">HOT</option><option value="sweet">SWEET</option><option value="rich">RICH</option></select></label><label>맛 단계<select name="level" defaultValue={state?.featured?.level??1}>{[1,2,3,4,5].map(level=><option key={level} value={level}>{level}단계</option>)}</select></label></div><button className={styles.primary}>{busy?'저장 중…':'대표메뉴 저장'}</button></form></fieldset></section>
  </div>
  <section className={styles.notice} aria-label="구독설정"><h2>설정 및 구독</h2><p>월 {MAP_SUBSCRIPTION_AMOUNT_KRW.toLocaleString('ko-KR')}원(VAT 포함) · 결제된 이용 기간 동안 내 매장관리를 이용할 수 있습니다.</p><p>다음 결제 전 해지하면 이용 기간 종료 후 점주 기능이 잠깁니다. 공개 지도 탐색은 계속 이용할 수 있습니다.</p><MapSubscriptionSettings ownerVerified={Boolean(snapshot&&(snapshot.access.enabled||snapshot.access.code==='map_subscription_required'))}/></section>
  <details className={styles.notice}><summary>도움말</summary><p>영업 시작 전 오늘 상태를 확인하고 마감·휴무·재료소진 때 다시 변경해 주세요. 다른 접속의 지도에는 15초 이내에 갱신됩니다. 최근 24시간 내 유효한 점주 상태만 공개됩니다.</p></details>
 </main>;
}
