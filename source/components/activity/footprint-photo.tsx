'use client';
import {useState,type FormEvent} from 'react';
import {api} from '@/lib/client';
import {prepareReportPhoto} from '@/lib/prepare-report-photo';
import type {Photo,Visit} from '@/lib/activity/model';
export default function FootprintPhoto({visit,photos,onSaved}:{visit:Visit;photos:Photo[];onSaved:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const form=event.currentTarget,data=new FormData(form),photo=data.get('photo');if(!(photo instanceof File)||!photo.size)return;setBusy(true);setMessage('');try{data.set('visitId',visit.id);data.set('photo',await prepareReportPhoto(photo));await api('/api/activity/photo',{method:'POST',body:data});await onSaved();form.reset();setMessage('발자국에 사진을 보관했어요. 공개 제보는 아래 버튼에서 이어갈 수 있어요.')}catch(error){setMessage((error as Error).message)}finally{setBusy(false)}}
 return <div className="aw-footprint-photo">{photos.some(p=>p.url)&&<div className="aw-footprint-pictures">{photos.filter(p=>p.url).map(p=><img src={p.url} key={p.id} alt={visit.shop+' 방문 사진'} loading="lazy"/>)}</div>}<form onSubmit={submit}><label>발자국 사진 추가<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/></label><button disabled={busy}>{busy?'사진 저장 중…':'사진 올리기'}</button></form><a className="aw-button" href={'/suggestion?footprint='+encodeURIComponent(visit.id)+'#report'}>이 발자국으로 메뉴 제보하기 ↗</a>{message&&<p role="status">{message}</p>}</div>;
}
