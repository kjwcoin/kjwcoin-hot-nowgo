'use client';
import {useEffect,useState} from 'react';
import {UserRound,ArrowUpRight} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {LEVELS} from '@/lib/loyalty';
import {api} from '@/lib/client';
import {returnPath} from '@/lib/integration-policy';
import {browserDb} from '@/lib/supabase-browser';
import OAuthButtons from './oauth-buttons';
import {siteConfig,type SiteVariant} from '@/lib/site-config';
type State={customer:{id:string;nickname:string;phoneMasked:string;phoneVerified:boolean}|null;points:number|null;level:typeof LEVELS[number];auth:{ready:boolean;accountUrl:string|null};consentRequired:boolean};
export default function CustomerPanel({variant='hot'}:{variant?:SiteVariant}){
 const theme=siteConfig(variant);
 const [open,setOpen]=useState(false),[data,setData]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[returnTo,setReturnTo]=useState('/');
 async function refresh(){try{setData(await api<State>('/api/customer/me'));setError('')}catch{setError('회원 정보를 불러오지 못했어요. 잠시 후 다시 열어주세요.')}}
 useEffect(()=>{void refresh();const changed=()=>void refresh();window.addEventListener('hot-customer-change',changed);return()=>window.removeEventListener('hot-customer-change',changed)},[]);
 const next=LEVELS.find(l=>l.min>(data?.points||0));
 async function logout(){setBusy(true);try{const {error}=await browserDb().auth.signOut();if(error)throw error;await refresh();window.dispatchEvent(new Event('hot-customer-change'))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <><Button className="customer-trigger" variant="ghost" onClick={()=>{setReturnTo(returnPath(window.location.pathname+window.location.search+window.location.hash));setOpen(true);void refresh()}} aria-label={data?.customer?'내 활동':'통합 로그인·회원가입'}><UserRound size={18}/><span>{data?.customer?'내 활동':'통합 로그인·회원가입'}</span></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="customer-dialog"><DialogTitle className="customer-title">{data?.customer?`${data.customer.nickname}님의 맛 기록`:'NOWGO 통합회원'}</DialogTitle><DialogDescription>한 번 가입하고 {theme.name}와 NOWGO를 같은 계정으로 이용해요.</DialogDescription>
 {!data&&!error&&<p>회원 정보를 확인하고 있어요.</p>}
 {!data?.customer&&<><div className="unified-auth-message"><strong>{data?.consentRequired?`${theme.name} 이용 동의가 필요해요.`:'먼저 가입 유형을 선택해 주세요.'}</strong><p>{data?.consentRequired?'로그인한 계정으로 이용 동의를 완료해 주세요.':'점주와 일반 사용자의 회원 ID를 분리해 발급합니다. 아래에서 유형을 고르세요.'}</p></div><div className="unified-auth-actions"><a href="https://www.nowgo.space/account/join?role=owner">점주로 가입하기 <ArrowUpRight size={17}/></a><a href="https://www.nowgo.space/account/join?role=member">일반 사용자로 가입하기 <ArrowUpRight size={17}/></a></div>{data?.consentRequired?<div className="unified-auth-actions"><a href={"/account/join?returnTo="+encodeURIComponent(returnTo)}>{theme.name} 이용 동의 완료하기 <ArrowUpRight size={17}/></a></div>:<><p className="customer-note">이미 가입했다면 아래에서 로그인하세요.</p><OAuthButtons flavor={variant} returnTo={returnTo}/></>}<p className="customer-note">공식 점주 제보는 NOWGO의 매장 권한 확인이 필요해요.</p><a className="text-link" href="/terms">통합회원·제보 원칙 보기 ↗</a></>}
 {data?.customer&&<><div className="customer-level"><span className="customer-level-number">{data.level.level}</span><div><small>나의 기여 레벨</small><h3>{data.level.name}</h3><p>{data.points===null?'기여 기록 연결 준비 중':`확인된 기여 ${data.points}점${next?` · 다음 단계까지 ${next.min-data.points}점`:''}`}</p></div></div><p className="customer-note">이 계정으로 {theme.name}의 메뉴를 저장·제보할 수 있어요. 공식 점주 권한은 NOWGO에서 확인합니다.</p><a className="text-link" href="https://www.nowgo.space/owner/login" target="_blank" rel="noreferrer">NOWGO 매장 관리 ↗</a><Button variant="ghost" disabled={busy} onClick={logout}>{theme.name}에서 로그아웃</Button></>}
 {error&&<p className="customer-error" role="alert">{error}</p>}
 </DialogContent></Dialog></>
}
