'use client';
import {useState} from 'react';

/** The preview explains the separate information flow without publishing data. */
export default function PreviewStoreInformation(){
 const [open,setOpen]=useState(false);
 return <section className="source-preview-information" aria-label="매장정보 제보 미리보기">
  <button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>매장정보 제보 · 미리보기</button>
  {open&&<div role="status"><p>주소·메뉴·영업정보를 알리는 별도 제보예요. 미리보기에서는 매장정보를 저장하거나 공개하지 않아요. 맵기·사진 제보와 점주 영업정보 요청은 각각 따로 다뤄요.</p><button type="button" onClick={()=>setOpen(false)}>닫기</button></div>}
 </section>;
}
