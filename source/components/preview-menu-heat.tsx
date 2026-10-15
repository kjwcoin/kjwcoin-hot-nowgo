'use client';

import {useRef,useState} from 'react';
import {MedianPeppers} from '@/components/consumer-menu-heat';

export type PreviewHeatSummary={medianHeat:number|null;sampleCount:number;myHeat:number|null};
type Props={
 storeId:string;
 menus:readonly {id:string;name:string}[];
 menuId?:string|null;
 summary?:PreviewHeatSummary;
 onPreviewHeat?:(menuId:string,heat:number)=>void;
 onPreviewHeatReset?:()=>void;
};
const levels=[1,2,3,4,5] as const;

/** Review-only interaction. The parent owns one ephemeral latest vote per menu. */
export default function PreviewMenuHeat({storeId,menus,menuId,summary,onPreviewHeat,onPreviewHeatReset}:Props){
 const currentMenu=menus.find(menu=>menu.id===menuId)||menus[0];
 const [open,setOpen]=useState(false);
 const [draftMenuId,setDraftMenuId]=useState(currentMenu?.id||'');
 const [heat,setHeat]=useState<number|null>(null);
 const [eatenHere,setEatenHere]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const submitted=useRef(false);
 const formId=`source-heat-preview-${storeId}`;
 const validMenu=menus.some(menu=>menu.id===draftMenuId);
 const validHeat=heat!==null&&Number.isInteger(heat)&&heat>=1&&heat<=5;
 const canSubmit=Boolean(onPreviewHeat&&validMenu&&validHeat&&eatenHere);
 const hasSummary=summary?.medianHeat!==null&&summary?.medianHeat!==undefined&&summary.sampleCount>0;
 function close(){submitted.current=true;setOpen(false);setHeat(null);setEatenHere(false);trigger.current?.focus()}
 function start(){
  setDraftMenuId(currentMenu?.id||'');setHeat(summary?.myHeat??null);setEatenHere(false);submitted.current=false;setOpen(true);
 }
 return <section className="source-preview-heat" aria-label="이 메뉴를 먹고 느낀 맵기 미리보기" data-heat-mode="local-preview">
  <h3>이 메뉴를 먹고 느낀 맵기</h3>
  {hasSummary?<div className="source-preview-heat-summary" aria-live="polite">
   <strong>{currentMenu?.name}</strong>
   <small>지도 아이콘 미리보기</small>
   <span className="consumer-heat-value"><MedianPeppers heat={summary!.medianHeat!}/><b>미리보기 중앙값 {summary!.medianHeat}/5</b></span>
   <small>이 화면의 내 입력 {summary!.sampleCount}건 · 실제 고객 집계가 아니에요.</small>
  </div>:<p>아직 이 화면에 반영한 맵기가 없어요.</p>}
  <p className="source-preview-heat-note">이 화면에서만 시험해 볼 수 있어요. 메뉴마다 내 최신 입력 1개만 반영하며, 새로고침·초기화하면 지워져요.</p>
  <button ref={trigger} type="button" className="source-preview-heat-open" aria-expanded={open} aria-controls={formId} disabled={!onPreviewHeat||!currentMenu} onClick={()=>open?close():start()}>먹어본 메뉴 맵기 제보 · 미리보기</button>
  {open&&<form id={formId} className="source-preview-heat-form" aria-label="먹어본 메뉴 맵기 미리보기 입력" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close()}}} onSubmit={event=>{
   event.preventDefault();
   if(!canSubmit||!onPreviewHeat||heat===null||submitted.current)return;
   submitted.current=true;onPreviewHeat(draftMenuId,heat);close();
  }}>
   <div className="source-preview-heat-form-heading"><strong>메뉴별 맵기 입력</strong><button type="button" aria-label="맵기 미리보기 닫기" onClick={close}>닫기</button></div>
   <label className="source-preview-menu-label" htmlFor={`${formId}-menu`}>먹어본 메뉴</label>
   <select id={`${formId}-menu`} name="menuId" value={draftMenuId} autoFocus onChange={event=>{setDraftMenuId(event.target.value);setHeat(null);setEatenHere(false)}}>
    {menus.map(menu=><option key={menu.id} value={menu.id}>{menu.name}</option>)}
   </select>
   <fieldset><legend>이 메뉴를 먹고 느낀 맵기 · 1–5단계</legend><div className="source-preview-heat-levels">
    {levels.map(level=><label key={level}><input type="radio" name={`${formId}-heat`} value={level} checked={heat===level} onChange={()=>setHeat(level)}/><span>{level}</span></label>)}
   </div></fieldset>
   <label className="source-preview-eaten"><input type="checkbox" checked={eatenHere} onChange={event=>setEatenHere(event.target.checked)}/><span>이 매장에서 선택한 메뉴를 먹고 느낀 맵기예요.</span></label>
   <p>실제 제보는 등록되지 않아요. 선택한 메뉴의 미리보기 중앙값과 지도 아이콘에만 반영돼요.</p>
   <div className="source-preview-heat-form-actions"><button type="button" onClick={close}>취소</button><button type="submit" disabled={!canSubmit}>미리보기로 반영</button></div>
  </form>}
  <div className="source-preview-heat-footer"><small>실제 제보 등록·집계 공개는 아직 연결되지 않았어요.</small>{onPreviewHeatReset&&<button type="button" onClick={()=>{onPreviewHeatReset();close()}}>미리보기 초기화</button>}</div>
 </section>;
}
