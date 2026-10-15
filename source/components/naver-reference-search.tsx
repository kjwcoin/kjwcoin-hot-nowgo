'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {api,ApiError} from '@/lib/client';
import type {NaverSearchKind,NaverSearchResult} from '@/lib/naver-hub';
import styles from './naver-reference-search.module.css';
import {NAVER_RESULT_LIFETIME_MS,naverResultsExpired} from '@/lib/naver-result-retention';

// NAVER uses <b> only for highlights. All other provider text stays escaped by React.
export function NaverText({value}:{value:string}){
 return <>{value.split(/(<b>.*?<\/b>)/gi).map((part,index)=>/^<b>.*<\/b>$/i.test(part)?<strong key={index}>{part.slice(3,-4)}</strong>:part)}</>;
}
export default function NaverReferenceSearch(){
 const [query,setQuery]=useState(''),[kind,setKind]=useState<NaverSearchKind>('local');
 const [result,setResult]=useState<(NaverSearchResult&{expiresAt:number})|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[login,setLogin]=useState(false);
 const controller=useRef<AbortController|null>(null),sequence=useRef(0),submitting=useRef(false);
 useEffect(()=>()=>{sequence.current++;controller.current?.abort()},[]);
 useEffect(()=>{if(!result)return;const expire=()=>{if(naverResultsExpired(result.expiresAt))setResult(null)};const timer=setTimeout(expire,Math.max(0,result.expiresAt-Date.now()));document.addEventListener('visibilitychange',expire);window.addEventListener('pageshow',expire);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',expire);window.removeEventListener('pageshow',expire)}},[result]);
 function clear(){sequence.current++;controller.current?.abort();submitting.current=false;setBusy(false);setResult(null);setError('');setLogin(false)}
 async function search(event:FormEvent){
  event.preventDefault();if(submitting.current)return;
  submitting.current=true;controller.current?.abort();const abort=new AbortController();controller.current=abort;const run=++sequence.current;
  setBusy(true);setError('');setLogin(false);setResult(null);
  try{const data=await api<NaverSearchResult>('/api/naver-search?'+new URLSearchParams({kind,q:query.trim()}),{signal:abort.signal,cache:'no-store'});if(run===sequence.current)setResult({...data,expiresAt:Date.now()+NAVER_RESULT_LIFETIME_MS})}
  catch(cause){if(run===sequence.current&&!abort.signal.aborted){setError(cause instanceof Error?cause.message:'검색을 불러오지 못했어요.');setLogin(cause instanceof ApiError&&cause.status===401)}}
  finally{if(run===sequence.current){submitting.current=false;setBusy(false)}}
 }
 return <main className={styles.page}>
  <Link href="/">← HOT 지도로 돌아가기</Link>
  <h1>NAVER 검색 참고자료</h1>
  <p>지역검색과 블로그검색을 각각 확인해 보세요. 검색 결과가 HOT의 매장·메뉴로 자동 등록되지는 않아요.</p>
  <p className={styles.notice}>검색 결과만으로 매운 메뉴, 가격, 사진 사용 권한, 소유권 또는 현재 영업 상태를 확인할 수 없어요. 원문에서 직접 확인해 주세요.</p>
  <form onSubmit={event=>void search(event)} className={styles.form}>
   <label>검색 종류<select value={kind} onChange={event=>{clear();setKind(event.target.value as NaverSearchKind)}}><option value="local">지역검색</option><option value="blog">블로그검색</option></select></label>
   <label>검색어<input type="search" value={query} minLength={2} maxLength={70} required onChange={event=>{clear();setQuery(event.target.value)}} placeholder="지역과 매장·메뉴 이름"/></label>
   <button type="submit" disabled={busy||query.trim().length<2}>{busy?'검색 중…':'NAVER 검색'}</button>
  </form>
  {busy&&<p role="status">검색 결과를 불러오고 있어요.</p>}
  {error&&<p role="alert">{error}</p>}
  {login&&<a href="/account/join?type=user&returnTo=%2Fnaver-search">통합 로그인하고 검색하기 ↗</a>}
  {result&&<section aria-label={`NAVER ${result.kind==='local'?'지역':'블로그'}검색 결과`}>
   <h2>NAVER {result.kind==='local'?'지역':'블로그'}검색</h2>
   <p>{result.kind==='local'?'지역검색은 최대 5건을 제공하며 전국 매장 전체 목록이 아니에요.':'NAVER에서 제공한 순서로 표시해요.'}</p>
   {result.items.length?<ol className={styles.results}>{result.items.map((item,index)=><li key={index}>
    <h3>{item.link?<a href={item.link} target="_blank" rel="noopener noreferrer"><NaverText value={item.title}/> ↗</a>:<NaverText value={item.title}/>}</h3>
    {item.description&&<p><NaverText value={item.description}/></p>}
    {item.category&&<p>{item.category}</p>}{item.roadAddress&&<p>{item.roadAddress}</p>}{item.address&&<p>{item.address}</p>}
    {item.bloggername&&<p>{item.bloggername}{item.postdate?' · '+item.postdate:''}</p>}
   </li>)}</ol>:<p>검색 결과가 없어요.</p>}
  </section>}
  <p className={styles.attribution}>검색 제공: <a href="https://www.ncloud.com/product/applicationService/NAVERAPIHUB" target="_blank" rel="noopener noreferrer">NAVER API HUB</a></p>
 </main>;
}
