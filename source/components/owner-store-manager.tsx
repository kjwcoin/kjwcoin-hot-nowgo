'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {api,ApiError} from '@/lib/client';
import {browserDb} from '@/lib/supabase-browser';
import {publicConfig} from '@/lib/auth-config';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
import {OWNER_STATES,type OwnerSnapshot,type OwnerMenu} from '@/lib/owner-management';
import MenuFields from './owner/menu-fields';
import DashboardLink from './owner/dashboard-link';
import styles from './owner-store-manager.module.css';

export default function OwnerStoreManager({variant,linkId}:{variant:SiteVariant;linkId?:string}){
 const theme=siteConfig(variant),[snapshot,setSnapshot]=useState<OwnerSnapshot|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[needsLogin,setNeedsLogin]=useState(false),[selected,setSelected]=useState(''),[shutdown,setShutdown]=useState(false);
 const sequence=useRef(0),mounted=useRef(true),saving=useRef(false),storeRef=useRef('');
 const refresh=useCallback(async(store=storeRef.current)=>{
  const run=++sequence.current;
  try{const result=await api<OwnerSnapshot>('/api/owner/manage?'+new URLSearchParams({...store?{storeId:store}:{},...linkId?{link:linkId}:{}}));if(!mounted.current||run!==sequence.current)return;setSnapshot(result);setError('');setNeedsLogin(false);}
  catch(e){if(mounted.current&&run===sequence.current){setSnapshot(null);setError(e instanceof Error?e.message:'관리 정보를 불러오지 못했어요.');setNeedsLogin(e instanceof ApiError&&e.status===401);}}
 },[linkId]);
 useEffect(()=>{
  mounted.current=true;const initial=setTimeout(()=>void refresh(),0);const update=()=>{if(!document.hidden&&!saving.current)void refresh()};
  const timer=setInterval(update,15000),{data}=browserDb().auth.onAuthStateChange(()=>{sequence.current++;storeRef.current='';setSnapshot(null);setSelected('');setTimeout(()=>{if(mounted.current)void refresh()},0)});
  window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{mounted.current=false;sequence.current++;clearTimeout(initial);clearInterval(timer);data.subscription.unsubscribe();window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update)};
 },[refresh]);
 const storeId=snapshot?.storeId,store=snapshot?.stores.find(s=>s.id===storeId),enabled=!!snapshot?.access.enabled,menus=snapshot?.state?.menus||[],current=menus.find(m=>m.id===selected)||menus[0];
 async function save(body:Record<string,unknown>|FormData){
  if(!enabled||!storeId||saving.current)return false;
  saving.current=true;setBusy(true);setError('');setNotice('');
  try{const result=await api<{message:string}>('/api/owner/manage',{method:'POST',...(body instanceof FormData?{body}:{headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,storeId})})});if(mounted.current){setNotice(result.message);window.dispatchEvent(new Event('nowgo-owner-status-change'));await refresh(storeId)}return true}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'저장하지 못했어요.');return false}
  finally{saving.current=false;if(mounted.current)setBusy(false)}
 }
 async function register(event:FormEvent<HTMLFormElement>){event.preventDefault();const node=event.currentTarget,form=new FormData(node);form.set('storeId',storeId||'');if(await save(form))node.reset()}
 const photo=(menu:OwnerMenu)=>publicConfig().url+'/storage/v1/object/public/ng-map-menu-photos/'+menu.photoPath;
 const shellStyle={'--owner-accent':theme.accent} as CSSProperties;
 if(!snapshot)return <main className={styles.shell} style={shellStyle}><header className={styles.heading}><div><p className={styles.eyebrow}>{theme.name} · OWNER</p><h1>매장 대시보드</h1></div></header>{error?<div className={`${styles.notice} ${styles.error}`} role="alert"><p>{error}</p>{needsLogin?<Link className={styles.primaryLink} href={'/account/join?type=owner&returnTo='+encodeURIComponent('/owner/dashboard'+(linkId?'/'+linkId:''))}>점주 로그인</Link>:<button onClick={()=>void refresh()}>다시 확인</button>}<p><Link href="/owner/signup">점주 가입 안내</Link></p></div>:<p role="status">내 매장과 구독을 확인하고 있어요.</p>}</main>;
 if(!enabled)return <main className={styles.shell} style={shellStyle}><section className={styles.paywall}><p className={styles.eyebrow}>{theme.name} · OWNER</p><h1>매장 대시보드</h1><p>{store?store.name+'의 지도 구독을 확인해 주세요.':'점주 가입과 매장 소유권 확인을 먼저 완료해 주세요.'}</p><strong>월 8,000원 <small>부가세 포함</small></strong><p>영업현황 · 사진 필수 메뉴등록 · 메뉴품절 관리 · 맛·단계·결 설정</p><DashboardLink url={snapshot.managementUrl}/><Link className={styles.primaryLink} href={store&&snapshot.access.code!=='approval_required'?'/owner/subscribe':'/owner/signup'}>{store&&snapshot.access.code!=='approval_required'?'구독 페이지로 이동':'점주 가입하기'}</Link></section></main>;
 return <main className={styles.shell} style={shellStyle}>
 <header className={styles.heading}><div><p className={styles.eyebrow}>{theme.name} · OWNER</p><h1>{store?.name||'매장 대시보드'}</h1><p>메뉴와 오늘의 영업현황을 지도에 알려 주세요.</p></div><div>{snapshot.stores.length>1&&!linkId&&<label>관리할 매장<select value={storeId||''} disabled={busy} onChange={e=>{storeRef.current=e.target.value;setSelected('');setShutdown(false);void refresh(e.target.value)}}>{snapshot.stores.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>}<Link className={styles.secondary} href="/owner/subscribe">구독 정보</Link></div></header>
 <DashboardLink url={snapshot.managementUrl}/>
 <nav className={styles.nav} aria-label="매장 관리 기능">{[['status','영업현황'],['register-menu','메뉴등록'],['soldout','메뉴품절 관리'],['taste','맛·단계·결']].map(([id,text])=><a key={id} href={'#'+id}>{text}</a>)}</nav>
 {notice&&<p className={styles.message} role="status">{notice}</p>}{error&&<p className={`${styles.message} ${styles.error}`} role="alert">{error}</p>}
 <div className={styles.grid}>
 <section id="status" className={styles.card}><h2>영업현황</h2><p className={styles.description}>현재 상태를 누르면 지도에 반영됩니다. 오늘 상태는 다음 새벽 4시까지, 최대 24시간 표시됩니다.</p><div className={styles.statusButtons}>{OWNER_STATES.map(([value,text])=><button type="button" disabled={busy} aria-pressed={snapshot.state?.status?.value===value} key={value} onClick={()=>value==='permanently_closed'?setShutdown(true):void save({action:'status',value})}>{text}</button>)}</div>{shutdown&&<div className={styles.notice}><p>이 매장을 폐업 상태로 표시할까요?</p><button disabled={busy} onClick={()=>void save({action:'status',value:'permanently_closed'}).then(ok=>{if(ok)setShutdown(false)})}>폐업으로 표시</button><button disabled={busy} onClick={()=>setShutdown(false)}>취소</button></div>}</section>
 <section id="register-menu" className={styles.card}><h2>메뉴등록</h2><p className={styles.description}>메뉴마다 사진을 반드시 등록해 주세요. JPG·PNG·WebP, 5MB 이하.</p><form className={styles.form} onSubmit={register}><fieldset disabled={busy} className={styles.form}><label>메뉴명<input name="name" required maxLength={100}/></label><label>가격(원)<input name="price" type="number" required min={100} max={1000000} step={1}/></label><label>메뉴 사진 · 필수<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/></label><MenuFields variant={variant}/><button className={styles.primary} type="submit">{busy?'저장 중…':'사진과 메뉴 등록'}</button></fieldset></form></section>
 <section id="soldout" className={styles.card}><h2>메뉴품절 관리</h2><p className={styles.description}>품절된 메뉴를 표시하고, 다시 판매하면 판매중으로 변경해 주세요.</p>{menus.length?<div className={styles.list}>{menus.map(menu=><article className={styles.menuRow} key={menu.id}><Image unoptimized src={photo(menu)} width={64} height={64} alt={menu.name}/><div><strong>{menu.name}</strong><p>{menu.price.toLocaleString('ko-KR')}원 · {menu.soldout?'품절':'판매중'}</p></div><button type="button" disabled={busy} role="switch" aria-label={menu.name+' 품절'} aria-checked={menu.soldout} onClick={()=>void save({action:'soldout',menuId:menu.id,soldout:!menu.soldout})}>{menu.soldout?'판매 재개':'품절로 표시'}</button></article>)}</div>:<p>사진과 메뉴를 먼저 등록해 주세요.</p>}</section>
 <section id="taste" className={styles.card}><h2>맛·단계·결 설정</h2><p className={styles.description}>이 지도에서 검색할 맛의 단계와 결을 메뉴별로 설정합니다.</p>{current?<><label>설정할 메뉴<select value={current.id} disabled={busy} onChange={e=>setSelected(e.target.value)}>{menus.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><form key={current.id+':'+current.level+':'+current.flavor+':'+current.category} className={styles.form} onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);void save({action:'taste',menuId:current.id,level:Number(form.get('level')),flavor:form.get('flavor'),category:form.get('category')})}}><fieldset disabled={busy} className={styles.form}><MenuFields variant={variant} level={current.level} flavor={current.flavor} category={current.category}/><button type="submit" className={styles.primary}>맛 정보 저장</button></fieldset></form></>:<p>메뉴를 등록하면 맛 정보를 설정할 수 있어요.</p>}</section>
 </div></main>;
}
