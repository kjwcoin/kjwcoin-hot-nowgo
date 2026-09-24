'use client';
import {useEffect,useState} from 'react';
import {UserRound,ArrowUpRight} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {LEVELS} from '@/lib/loyalty';
import {api} from '@/lib/client';
import {returnPath} from '@/lib/integration-policy';
type State={customer:{id:string;nickname:string;phoneMasked:string;phoneVerified:boolean}|null;points:number|null;level:typeof LEVELS[number];auth:{ready:boolean;accountUrl:string|null}};
export default function CustomerPanel(){
 const [open,setOpen]=useState(false),[data,setData]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[returnTo,setReturnTo]=useState('/map');
 async function refresh(){try{setData(await api<State>('/api/customer/me'));setError('')}catch{setError('회원 정보를 불러오지 못했어요. 잠시 후 다시 열어주세요.')}}
 useEffect(()=>{void refresh();const changed=()=>void refresh();window.addEventListener('hot-customer-change',changed);return()=>window.removeEventListener('hot-customer-change',changed)},[]);
 const next=LEVELS.find(l=>l.min>(data?.points||0));
 async function logout(){setBusy(true);try{await api('/api/customer/logout',{method:'POST'});await refresh();window.dispatchEvent(new Event('hot-customer-change'))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <><Button className="customer-trigger" variant="ghost" onClick={()=>{setReturnTo(returnPath(window.location.pathname+window.location.search+window.location.hash));setOpen(true);void refresh()}} aria-label={data?.customer?'내 활동':'통합 로그인·회원가입'}><UserRound size={18}/><span>{data?.customer?'내 활동':'통합 로그인·회원가입'}</span></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="customer-dialog"><DialogTitle className="customer-title">{data?.customer?`${data.customer.nickname}님의 맛부심`:'NOWGO 통합회원'}</DialogTitle><DialogDescription>한 번 가입하고 HOT와 NOWGO를 같은 계정으로 이용해요.</DialogDescription>
 {!data&&!error&&<p>회원 정보를 확인하고 있어요.</p>}
 {data&&!data.customer&&<><div className="unified-auth-message"><strong>가입은 한 번이면 돼요.</strong><p>NOWGO에서 소셜 계정으로 가입하고 닉네임을 정해요. 기존 회원은 같은 계정으로 로그인하세요.</p></div>{data.auth.ready?<div className="unified-auth-actions"><a href={"/api/auth/start?returnTo="+encodeURIComponent(returnTo)}>통합 로그인·회원가입 <ArrowUpRight size={17}/></a></div>:<p className="customer-note" role="status">통합회원 연결 준비 중입니다. 지도와 메뉴는 지금 둘러볼 수 있고 제보 제출은 연결 후 열립니다.</p>}<p className="customer-note">점주도 같은 계정을 사용해요. 매장 소유권 확인을 마쳐야 공식 영업·품절 상태를 알릴 수 있습니다.</p><a className="text-link" href="/terms">통합회원·제보 원칙 보기 ↗</a></>}
 {data?.customer&&<><div className="customer-level"><span className="customer-level-number">{data.level.level}</span><div><small>나의 기여 레벨</small><h3>{data.level.name}</h3><p>{data.points===null?'기여 기록 연결 준비 중':`확인된 기여 ${data.points}점${next?` · 다음 단계까지 ${next.min-data.points}점`:''}`}</p></div></div><p className="customer-note">리뷰는 연결된 매장 미니홈피에서 이용할 수 있어요. 레벨은 확인된 기여로 올라가고 공식 점주 권한과는 별개예요.</p><details className="customer-benefits"><summary>레벨별 성장 조건</summary>{LEVELS.map(l=><div key={l.level}><b>Lv.{l.level} {l.name} · {l.min}점</b><span>{l.benefit}</span></div>)}</details><p className="customer-note">{data.customer.phoneMasked} · {data.customer.phoneVerified?'번호 인증됨':'번호 미인증'}</p>{data.auth.accountUrl&&<a className="text-link" href={data.auth.accountUrl} target="_blank" rel="noreferrer">내 NOWGO 계정 보기 ↗</a>}<Button variant="ghost" disabled={busy} onClick={logout}>HOT에서 로그아웃</Button></>}
 {error&&<p className="customer-error" role="alert">{error}</p>}
 </DialogContent></Dialog></>
}
