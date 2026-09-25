'use client';
import {useEffect,useState} from 'react';
import {UserRound,ArrowUpRight} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {LEVELS} from '@/lib/loyalty';
import {api} from '@/lib/client';
import {returnPath} from '@/lib/integration-policy';
import {browserDb} from '@/lib/supabase-browser';
type State={customer:{id:string;nickname:string;phoneMasked:string;phoneVerified:boolean}|null;points:number|null;level:typeof LEVELS[number];auth:{ready:boolean;accountUrl:string|null};consentRequired:boolean};
export default function CustomerPanel(){
 const [open,setOpen]=useState(false),[data,setData]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[returnTo,setReturnTo]=useState('/');
 async function refresh(){try{setData(await api<State>('/api/customer/me'));setError('')}catch{setError('회원 정보를 불러오지 못했어요. 잠시 후 다시 열어주세요.')}}
 useEffect(()=>{void refresh();const changed=()=>void refresh();window.addEventListener('sweet-customer-change',changed);return()=>window.removeEventListener('sweet-customer-change',changed)},[]);
 const next=LEVELS.find(l=>l.min>(data?.points||0));
 async function logout(){setBusy(true);try{const {error}=await browserDb().auth.signOut();if(error)throw error;await refresh();window.dispatchEvent(new Event('sweet-customer-change'))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <><Button className="customer-trigger" variant="ghost" onClick={()=>{setReturnTo(returnPath(window.location.pathname+window.location.search+window.location.hash));setOpen(true);void refresh()}} aria-label={data?.customer?'내 활동':'통합 로그인·회원가입'}><UserRound size={18}/><span>{data?.customer?'내 활동':'통합 로그인·회원가입'}</span></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="customer-dialog"><DialogTitle className="customer-title">{data?.customer?`${data.customer.nickname}님의 디저트 취향`:'NOWGO 통합회원'}</DialogTitle><DialogDescription>한 번 가입하고 SWEET와 NOWGO를 같은 계정으로 이용해요.</DialogDescription>
 {!data&&!error&&<p>회원 정보를 확인하고 있어요.</p>}
 {data&&!data.customer&&<><div className="unified-auth-message"><strong>SWEET에서도 바로 가입할 수 있어요.</strong><p>NOWGO와 같은 통합 계정으로 가입·로그인합니다. 이미 가입했다면 같은 구글 계정을 선택하세요.</p></div>{data.auth.ready?<div className="unified-auth-actions"><a href={"/account/join?returnTo="+encodeURIComponent(returnTo)}>{data.consentRequired?'SWEET 이용 동의 완료하기':'통합회원 가입·로그인'} <ArrowUpRight size={17}/></a></div>:<p className="customer-note" role="status">통합회원 연결을 준비하고 있어요. 메뉴는 지금 둘러볼 수 있습니다.</p>}<p className="customer-note">공식 점주 제보는 같은 계정으로 NOWGO의 매장 권한을 확인한 뒤 이용할 수 있어요.</p><a className="text-link" href="/terms">통합회원·제보 원칙 보기 ↗</a></>}
 {data?.customer&&<><div className="customer-level"><span className="customer-level-number">{data.level.level}</span><div><small>나의 기여 레벨</small><h3>{data.level.name}</h3><p>{data.points===null?'기여 기록 연결 준비 중':`확인된 기여 ${data.points}점${next?` · 다음 단계까지 ${next.min-data.points}점`:''}`}</p></div></div><p className="customer-note">이 계정으로 SWEET의 디저트를 저장·제보할 수 있어요. 공식 점주 권한은 NOWGO에서 확인합니다.</p><a className="text-link" href="https://www.nowgo.space/owner/login" target="_blank" rel="noreferrer">NOWGO 매장 관리 ↗</a><Button variant="ghost" disabled={busy} onClick={logout}>SWEET에서 로그아웃</Button></>}
 {error&&<p className="customer-error" role="alert">{error}</p>}
 </DialogContent></Dialog></>
}
