'use client';
import {useState,type FormEvent} from 'react';
import {CalendarDays,Check,ChevronLeft,ChevronRight,Clock,UsersRound} from 'lucide-react';
import type {SiteVariant} from '@/lib/site-config';
import styles from './booking-actions.module.css';

type Kind='reservation'|'waiting';
type Booking={id:string;date:string;time:string;people:number;status:'active'|'cancelled'};
type Waiting={id:string;people:number;ahead:number;number:number;status:'waiting'|'called'|'cancelled'};
type Records={reservation?:Booking;waiting?:Waiting};
const koreanDate=(date=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const dateLabel=(value:string)=>new Date(value+'T12:00:00+09:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Seoul'});
const makeId=(prefix:string)=>prefix+'-'+Math.random().toString(36).slice(2,7).toUpperCase();

export default function DemoBooking({kind,placeId,storeName,variant,onClose}:{kind:Kind;placeId:string;storeName:string;variant:SiteVariant;onClose:()=>void}){
 const key=`nowgo-booking-demo-v1:${variant}:${placeId}:${koreanDate()}`;
 const [tab,setTab]=useState<Kind>(kind);
 const [records,setRecords]=useState<Records>(()=>{try{return JSON.parse(sessionStorage.getItem(key)||'{}') as Records}catch{return {}}});
 const [date,setDate]=useState(koreanDate()),[time,setTime]=useState(''),[people,setPeople]=useState(2);
 const [phone,setPhone]=useState('01000000000'),[review,setReview]=useState(false),[notice,setNotice]=useState('');
 const [month,setMonth]=useState(()=>koreanDate().slice(0,7));
 const [year,monthNumber]=month.split('-').map(Number);
 const firstDay=new Date(year,monthNumber-1,1).getDay();
 const days=new Date(year,monthNumber,0).getDate();
 const maxDate=koreanDate(new Date(Date.now()+60*86400000));
 const current=tab==='reservation'?records.reservation:records.waiting;
 const active=current&&current.status!=='cancelled';
 const hours=Array.from({length:23},(_,i)=>`${String(10+Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`);
 const nowMinutes=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':')[0])*60+Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',minute:'2-digit'}).format(new Date()));
 function save(next:Records){setRecords(next);try{sessionStorage.setItem(key,JSON.stringify(next))}catch{/* The current dialog remains usable when storage is unavailable. */}}
 function moveMonth(delta:number){const next=new Date(year,monthNumber-1+delta,1);setMonth(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`)}
 function submit(event:FormEvent){event.preventDefault();if(tab==='reservation'&&!time)return;setReview(true)}
 function confirm(){
  if(tab==='reservation')save({...records,reservation:{id:makeId('R'),date,time,people,status:'active'}});
  else save({...records,waiting:{id:makeId('W'),people,ahead:3,number:4,status:'waiting'}});
  setReview(false);setNotice('체험 접수를 완료했어요.');
 }
 function cancel(){
  if(tab==='reservation'&&records.reservation)save({...records,reservation:{...records.reservation,status:'cancelled'}});
  if(tab==='waiting'&&records.waiting)save({...records,waiting:{...records.waiting,status:'cancelled'}});
  setNotice('체험 접수를 취소했어요. 다시 선택할 수 있어요.');
 }
 return <div className={styles.demo}>
  <div className={styles.storeHeading}><span className={styles.demoTag}>가매장 · 체험</span><h2>{storeName.replace(/ · 가매장$/,'')}</h2><p>예약과 웨이팅을 미리 이용해 보세요. 실제 매장에 접수되지는 않아요.</p></div>
  <div className={styles.tabs} aria-label="예약 또는 웨이팅">{(['reservation','waiting'] as const).map(value=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>{setTab(value);setReview(false);setNotice('')}}>{value==='reservation'?<CalendarDays size={17}/>:<UsersRound size={17}/>} {value==='reservation'?'예약하기':'웨이팅수 보기'}</button>)}</div>
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
  {active?<section className={styles.result}>
   <span className={styles.successIcon}><Check size={27}/></span><span className={styles.eyebrow}>체험 접수 내역</span>
   <h3>{tab==='reservation'?'예약을 남겼어요':records.waiting?.status==='called'?'입장할 차례예요':'나의 순번이 생겼어요'}</h3>
   {tab==='reservation'&&records.reservation?<><div className={styles.ticketNumber}>{dateLabel(records.reservation.date)}</div><p>{records.reservation.time} · {records.reservation.people}명</p><small>예약번호 {records.reservation.id}</small></>:records.waiting?<><div className={styles.ticketNumber}>{records.waiting.number}<span>번</span></div><p>내 앞 <b>{records.waiting.ahead}팀</b> · {records.waiting.people}명</p><small>{records.waiting.status==='called'?'입장 호출 체험이 완료됐어요.':`예상 대기 ${records.waiting.ahead*5}~${records.waiting.ahead*5+5}분 · 체험값`}</small><div className={styles.queueTrack}>{[3,2,1,0].map(n=><span className={records.waiting!.ahead<=n?styles.queueDone:''} key={n}>{n===0?'내 차례':`${n}팀`}</span>)}</div><button type="button" className={styles.secondary} disabled={records.waiting.ahead===0} onClick={()=>{const item=records.waiting!;const ahead=Math.max(0,item.ahead-1);save({...records,waiting:{...item,ahead,status:ahead===0?'called':'waiting'}});setNotice(ahead===0?'띵동! 지금 입장할 차례예요. · 알림 체험':'앞 팀이 입장했어요. 나의 순번이 가까워졌어요.')}}>앞 팀 입장 체험</button></>:null}
   <button type="button" className={styles.primary} onClick={onClose}>지도로 돌아가기</button><button type="button" className={styles.textButton} onClick={cancel}>{tab==='reservation'?'예약 취소':'웨이팅 취소'}</button>
  </section>:review?<section className={styles.review}>
   <span className={styles.eyebrow}>마지막으로 확인해 주세요</span><h3>{tab==='reservation'?'이 일정으로 예약할까요?':'웨이팅을 접수할까요?'}</h3>
   <dl><div><dt>매장</dt><dd>{storeName.replace(/ · 가매장$/,'')}</dd></div>{tab==='reservation'?<><div><dt>날짜</dt><dd>{dateLabel(date)}</dd></div><div><dt>시간</dt><dd>{time}</dd></div></>:<div><dt>현재 대기</dt><dd>3팀 · 체험값</dd></div>}<div><dt>인원</dt><dd>{people}명</dd></div><div><dt>연락처</dt><dd>{phone.replace(/(\d{3})\d+(\d{4})$/,'$1-****-$2')}</dd></div></dl>
   <p className={styles.hint}>체험 정보는 이 브라우저 탭에서만 사용해요. 연락처는 저장하거나 발송에 사용하지 않아요.</p><button type="button" className={styles.primary} onClick={confirm}>체험 접수하기</button><button type="button" className={styles.textButton} onClick={()=>setReview(false)}>다시 선택하기</button>
  </section>:<form className={styles.form} onSubmit={submit}>
   {tab==='reservation'?<>
    <section><div className={styles.sectionTitle}><span>1</span><h3>언제 방문하시나요?</h3></div><div className={styles.calendarHeading}><button type="button" aria-label="이전 달" disabled={month<=koreanDate().slice(0,7)} onClick={()=>moveMonth(-1)}><ChevronLeft size={20}/></button><b>{year}년 {monthNumber}월</b><button type="button" aria-label="다음 달" disabled={month>=maxDate.slice(0,7)} onClick={()=>moveMonth(1)}><ChevronRight size={20}/></button></div><div className={styles.calendar}>{['일','월','화','수','목','금','토'].map(day=><span key={day}>{day}</span>)}{Array.from({length:firstDay},(_,i)=><span key={'empty'+i}/>)}{Array.from({length:days},(_,i)=>{const value=`${month}-${String(i+1).padStart(2,'0')}`;return <button type="button" key={value} aria-label={dateLabel(value)} aria-pressed={date===value} disabled={value<koreanDate()||value>maxDate} onClick={()=>{setDate(value);setTime('')}}>{i+1}{value===koreanDate()&&<small>오늘</small>}</button>})}</div></section>
    <section><div className={styles.sectionTitle}><span>2</span><h3>시간을 골라 주세요</h3></div><p className={styles.hint}><Clock size={14}/> {dateLabel(date)} · 30분 간격</p><div className={styles.slots}>{hours.map(value=>{const [h,m]=value.split(':').map(Number);return <button type="button" key={value} aria-pressed={time===value} disabled={date===koreanDate()&&h*60+m<=nowMinutes} onClick={()=>setTime(value)}>{value}</button>})}</div>{date===koreanDate()&&nowMinutes>=21*60&&<p className={styles.hint}>오늘 선택할 시간이 없어요. 다른 날짜를 골라 주세요.</p>}</section>
   </>:<section className={styles.waitingSummary}><span className={styles.eyebrow}>현재 대기 현황 · 체험값</span><strong>3<span>팀</span></strong><p>약 15~20분 뒤 입장 · 예시</p><div>접수하면 내 순번과 앞 팀 수를 확인할 수 있어요.</div></section>}
   <section><div className={styles.sectionTitle}><span>{tab==='reservation'?'3':'1'}</span><h3>몇 분이 함께하시나요?</h3></div><div className={styles.people}>{[1,2,3,4,5,6].map(n=><button type="button" key={n} aria-pressed={people===n} onClick={()=>setPeople(n)}>{n}명</button>)}</div></section>
   <section><div className={styles.sectionTitle}><span>{tab==='reservation'?'4':'2'}</span><h3>연락처를 확인해 주세요</h3></div><label className={styles.phoneLabel}>휴대폰 번호<input type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,11))} pattern="01[0-9]{8,9}" required aria-describedby="demo-phone-help"/></label><p id="demo-phone-help" className={styles.hint}>체험용 번호가 입력돼 있어요. 문자나 푸시가 발송되지 않아요.</p></section>
   <div className={styles.submitBar}><p>{tab==='reservation'?`${dateLabel(date)} · ${time||'시간 선택'} · ${people}명`:`현재 3팀 · ${people}명`}</p><button className={styles.primary} disabled={tab==='reservation'&&!time} type="submit">{tab==='reservation'?'예약 내용 확인':'웨이팅 내용 확인'}</button></div>
  </form>}
 </div>;
}
