'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
export default function ReviewLink({placeId,isDemo}:{placeId:string,isDemo:boolean}){
 const [url,setUrl]=useState<string|null>(null);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)setUrl(null)});if(!isDemo)api<{url:string|null}>('/api/review-link/'+encodeURIComponent(placeId)).then(d=>{if(active)setUrl(d.url)}).catch(()=>{});return()=>{active=false}},[placeId,isDemo]);
 return <div className="mini-home-review">{url?<a className="text-link" href={url} target="_blank" rel="noreferrer">나우고 매장 미니홈피에서 리뷰 쓰기 ↗</a>:<strong>{isDemo?'가매장은 리뷰를 받지 않아요':'미니홈피 리뷰 · 매장 연결 준비 중'}</strong>}<p className="small-note">리뷰와 인증 사진은 나우고 매장 미니홈피에 쌓여요.</p></div>
}
