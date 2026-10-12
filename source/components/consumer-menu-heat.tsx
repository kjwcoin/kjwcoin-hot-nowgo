'use client';
import {selectedReportingEnabled,HOT_REPORTING_PENDING_MESSAGE,type HotReportingState} from '@/lib/hot-reporting-phase';
import {useEffect,useRef,useState} from 'react';
import {medianPepperFills} from '@/lib/hot-menu-heat';
import {createMenuHeatLoader,type MenuHeatState} from '@/lib/menu-heat-client';
const Pepper=()=> <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 3c-2 0-3 1-3 3l2 1c0-1 0-2 2-2z"/><path d="M16 6c-3-1-5 1-5 4-1 5-4 8-9 10 7 1 16-4 18-10 1-2-1-4-4-4z"/></svg>;
/** Exactly five segments. Sample count cannot change the chili fill. */
export function MedianPeppers({heat}:{heat:number}){
 return <span className="median-peppers" aria-hidden="true">{medianPepperFills(heat).map((fill,index)=><span key={index} className="median-pepper"><Pepper/><span className="median-pepper-fill" style={{width:`${fill*100}%`}}><Pepper/></span></span>)}</span>;
}
type Props={storeId:string;menus:readonly {id:string;name:string}[];reportingState?:HotReportingState};
export function MenuHeatSummary({menus,state}:{menus:Props['menus'];state:MenuHeatState}){
 return <><h3>고객이 맛본 메뉴별 매운맛</h3><p className="consumer-heat-scale">실제 1–5단계 평가의 중앙값 · 참여 고객 수와 별도 표시</p>
  {state.status==='loading'&&<p role="status">메뉴별 매운맛 평가 확인 중</p>}
  {state.status==='pending'&&<p role="status">메뉴별 매운맛 집계 준비 중</p>}
  {state.status==='error'&&<p role="status">매운맛 평가를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.</p>}
  {state.status==='ready'&&menus.map(menu=>{const summary=state.summaries.find(row=>row.menuId===menu.id);return summary?<div className="consumer-heat-menu" key={menu.id} data-menu-heat={menu.id}><strong>{menu.name}</strong>{summary.medianHeat===null?<span>아직 이 메뉴의 고객 평가가 없어요.</span>:<span className="consumer-heat-value"><MedianPeppers heat={summary.medianHeat}/><b>중앙값 {summary.medianHeat}/5</b></span>}<span className="consumer-heat-count">참여 고객 {summary.sampleCount}명</span></div>:null})}
  <small>선택한 메뉴에 연결된 고객 평가만 집계해요. 자유입력 제보·점주 영업정보 요청 수는 합치지 않아요.</small>
 </>;
}
export default function ConsumerMenuHeat(props:Props){if(props.reportingState!=='enabled'||!selectedReportingEnabled())return <section className="consumer-menu-heat" aria-label="메뉴별 매운맛 평가 준비 중" data-reporting-state="pending"><p role="status">{HOT_REPORTING_PENDING_MESSAGE}</p></section>;return <ConsumerMenuHeatContent key={props.storeId+':'+JSON.stringify(props.menus.map(menu=>menu.id))} {...props}/>}
function ConsumerMenuHeatContent({storeId,menus}:Props){
 const [state,setState]=useState<MenuHeatState>({status:'loading'});const root=useRef<HTMLElement>(null);
 const key=JSON.stringify(menus.map(menu=>menu.id));
 useEffect(()=>{
  const loader=createMenuHeatLoader({reportingState:'enabled',storeId,menuIds:JSON.parse(key),onState:setState});
  if(typeof IntersectionObserver==='undefined'||!root.current){loader.start();return()=>loader.dispose()}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();loader.start()}},{rootMargin:'200px'});
  observer.observe(root.current);return()=>{observer.disconnect();loader.dispose()};
 },[storeId,key]);
 return <section ref={root} className="consumer-menu-heat" aria-label="메뉴별 고객 매운맛 중앙값"><MenuHeatSummary menus={menus} state={state}/></section>;
}
