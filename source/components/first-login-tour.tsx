'use client';

import {useEffect,useRef,useState} from 'react';
import {driver,type DriveStep,type Driver} from 'driver.js';
import 'driver.js/dist/driver.css';
import {browserDb} from '@/lib/supabase-browser';

type Taste='hot'|'rich'|'sweet';
type Page='map'|'suggestion';
type Journey='find'|'report';

// This is a preference, never an authorization decision. It is scoped to an
// authenticated user and to this taste site on the current browser.
export const tourKey=(taste:Taste,userId:string)=>`nowgo:first-login-tour:v1:${taste}:${userId}`;
const pendingKey=(taste:Taste,userId:string)=>`nowgo:first-login-tour:pending:v1:${taste}:${userId}`;

const findSteps:DriveStep[]=[
 {element:'.explorer-search',popover:{title:'1단계 · 메뉴 검색',description:'먹고 싶은 메뉴나 가게 이름을 입력해 보세요.'}},
 {element:'.explorer-filters label:nth-child(1)',popover:{title:'2단계 · 맛의 강도',description:'오늘 먹고 싶은 맛의 단계를 선택해요.'}},
 {element:'.explorer-filters label:nth-child(2)',popover:{title:'3단계 · 맛의 결',description:'취향에 맞는 맛의 종류를 골라요.'}},
 {element:'.explorer-filters label:nth-child(3)',popover:{title:'4단계 · 메뉴 종류',description:'찾고 싶은 메뉴로 결과를 좁혀요.'}},
 {element:'.explorer-filters label:nth-child(4)',popover:{title:'5단계 · 한 끼 예산',description:'예산을 정하면 조건에 맞는 메뉴만 볼 수 있어요.'}},
 {element:'.explorer-results-heading',popover:{title:'6단계 · 결과 확인',description:'목록이나 지도에서 메뉴를 누르고, 출발 전 매장 상태를 확인해요.'}},
];

function visibleReportButton(){
 return Array.from(document.querySelectorAll<HTMLElement>('.explorer-report')).find(el=>getComputedStyle(el).display!=='none')||document.querySelector<HTMLElement>('.explorer-report');
}

export default function FirstLoginTour({taste,page}:{taste:Taste;page:Page}){
 const [choice,setChoice]=useState(false);
 const identity=useRef<string|null>(null);
 const active=useRef<Driver|null>(null);

 useEffect(()=>{
  let mounted=true;
  let db:ReturnType<typeof browserDb>;
  try{db=browserDb()}catch{return}
  function finish(){
   const userId=identity.current;
   if(userId){
    try{localStorage.setItem(tourKey(taste,userId),'done');sessionStorage.removeItem(pendingKey(taste,userId))}catch{}
   }
   active.current?.destroy();active.current=null;setChoice(false);
  }
  function begin(journey:Journey,resume=false){
   if(!mounted||active.current)return;
   setChoice(false);
   const reportMapStep:DriveStep={element:visibleReportButton()||'.explorer-report',popover:{title:'1단계 · 제보하기',description:'화면 오른쪽의 제보 버튼에서 메뉴 제보 화면으로 이어집니다. 다음을 누르면 제보 화면으로 이동해요.'}};
   const reportPageSteps:DriveStep[]=[
    {element:'.report-section .report-copy',popover:{title:'2단계 · 제보 내용',description:'가게와 메뉴, 가격, 직접 확인한 날짜와 연락처를 정확히 입력해요.'}},
    {element:'.report-form .upload-field',popover:{title:'3단계 · 사진과 제출',description:'직접 찍은 음식 사진을 첨부하고 동의 항목을 확인한 뒤 아래 제보 버튼을 눌러요.'}},
   ];
   const steps=journey==='find'?findSteps:page==='map'?[reportMapStep]:reportPageSteps;
   const tour=driver({
    steps,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches,
    smoothScroll:true,allowClose:false,allowKeyboardControl:false,
    disableActiveInteraction:true,overlayOpacity:0.65,stagePadding:8,stageRadius:10,
    popoverClass:`nowgo-tour-popover nowgo-tour-${taste}`,
    showProgress:journey==='find',progressText:'{{current}} / {{total}}',
    showButtons:['next','close'],nextBtnText:'다음',doneBtnText:'완료',
    onPopoverRender:popover=>{popover.closeButton.textContent='건너뛰기';popover.closeButton.setAttribute('aria-label','가이드 건너뛰기')},
    onCloseClick:finish,
    onNextClick:(_element,_step,{driver:current})=>{
     if(journey==='report'&&page==='map'){
      const userId=identity.current;
      if(userId)try{sessionStorage.setItem(pendingKey(taste,userId),'report')}catch{}
      current.destroy();active.current=null;
      location.assign('/suggestion#report');
     }else if(current.getActiveIndex()===steps.length-1){finish()}
     else current.moveNext();
    },
   });
   active.current=tour;
   if(resume)document.getElementById('report')?.scrollIntoView({block:'start'});
   requestAnimationFrame(()=>{if(mounted&&active.current===tour)tour.drive()});
  }
  const {data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'){
    identity.current=null;active.current?.destroy();active.current=null;
    queueMicrotask(()=>{if(mounted)setChoice(false)});return;
   }
   if(event!=='INITIAL_SESSION'&&event!=='SIGNED_IN')return;
   const userId=session?.user?.id;
   if(!userId)return;
   identity.current=userId;
   queueMicrotask(()=>{
    if(!mounted||identity.current!==userId)return;
    try{
     if(localStorage.getItem(tourKey(taste,userId))==='done')return;
     const pending=sessionStorage.getItem(pendingKey(taste,userId));
     if(page==='suggestion'){
      if(pending==='report'&&!active.current)begin('report',true);
     }else if(pending==='report'){
      if(!active.current)begin('report');
     }else setChoice(true);
    }catch{/* Without storage the once-only guarantee cannot be kept. */}
   });
  });
  const start=(event:Event)=>begin((event as CustomEvent<Journey>).detail);
  window.addEventListener('nowgo-tour-start',start);
  window.addEventListener('nowgo-tour-skip',finish);
  return()=>{mounted=false;subscription.unsubscribe();window.removeEventListener('nowgo-tour-start',start);window.removeEventListener('nowgo-tour-skip',finish);active.current?.destroy();active.current=null};
 },[taste,page]);

 // The buttons are rendered only after Supabase reports an authenticated session.
 return choice&&page==='map'?<div className={`nowgo-tour-choice nowgo-tour-${taste}`} role="dialog" aria-modal="true" aria-labelledby="nowgo-tour-title">
  <div className="nowgo-tour-choice-card">
   <span className="nowgo-tour-eyebrow">처음 방문한 회원을 위한 안내</span>
   <h2 id="nowgo-tour-title">어디부터 둘러볼까요?</h2>
   <p>원하는 사용법을 골라 화면을 따라가 보세요.</p>
   <button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('nowgo-tour-start',{detail:'find'}))}>맛집 찾기 <span>6단계 안내 →</span></button>
   <button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('nowgo-tour-start',{detail:'report'}))}>제보하기 <span>제보 화면까지 안내 →</span></button>
   <button type="button" className="nowgo-tour-skip" onClick={()=>window.dispatchEvent(new Event('nowgo-tour-skip'))}>건너뛰기</button>
  </div>
 </div>:null;
}
