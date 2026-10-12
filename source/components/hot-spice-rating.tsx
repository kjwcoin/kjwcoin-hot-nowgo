'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';

type Summary={menuId:string;median:number|null;count:number;provisional:boolean};
export default function HotSpiceRating({menuId}:{menuId:string}){
 const [summary,setSummary]=useState<Summary|null>(null);
 const [level,setLevel]=useState(4);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  let active=true;setSummary(null);setMessage('');
  void api<Summary>('/api/spice-ratings?menuId='+encodeURIComponent(menuId))
   .then(data=>{if(active)setSummary(data)})
   .catch(()=>{if(active)setMessage('평가 현황을 불러오지 못했어요.')});
  return()=>{active=false};
 },[menuId]);
 async function save(){
  if(saving)return;setSaving(true);setMessage('');
  try{
   await api('/api/spice-ratings',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({menuId,level})});
   const next=await api<Summary>('/api/spice-ratings?menuId='+encodeURIComponent(menuId));
   setSummary(next);setMessage('매운맛 평가를 저장했습니다.');
  }catch(e){setMessage(e instanceof Error?e.message:'로그인한 뒤 다시 시도해 주세요.')}
  finally{setSaving(false)}
 }
 return <section aria-label="메뉴 매운맛 평가" style={{padding:'14px',border:'1px solid #e5e7eb',borderRadius:12,marginTop:14}}>
  <h3 style={{fontWeight:800,fontSize:16,marginBottom:5}}>이 메뉴, 얼마나 매울까요?</h3>
  <p style={{fontSize:13,margin:'0 0 10px'}}>방문자 평가 중앙값: <strong>{summary?.median===null||!summary?'평가 전':summary.median+' / 8단계'}</strong> · {summary?.count??0}명{summary?.provisional?' · 초기 평가':''}</p>
  <label htmlFor={'hot-spice-'+menuId} style={{fontSize:13}}>내가 느낀 매운맛: {level}단계</label>
  <input id={'hot-spice-'+menuId} type="range" min={1} max={8} step={1} value={level} onChange={e=>setLevel(Number(e.target.value))} style={{width:'100%',accentColor:'#c93421'}}/>
  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#6b7280'}}><span>1 순한맛</span><span>8 극한 매운맛</span></div>
  <button type="button" disabled={saving} onClick={()=>void save()} style={{marginTop:10,padding:'9px 12px',background:'#c93421',color:'white',border:0,borderRadius:8,fontWeight:700}}>{saving?'저장 중…':'내 평가 저장 / 수정'}</button>
  {message&&<p role="status" style={{fontSize:12,marginTop:8}}>{message}</p>}
 </section>
}
