'use client';
import RegularHomeLink from './regular-home-link';
import {useState} from 'react';
import {UserRound,LogOut} from 'lucide-react';
import {browserDb} from '@/lib/supabase-browser';
import styles from './customer-account.module.css';
import {Button} from '@/components/ui/button';
import type {SiteVariant} from '@/lib/site-config';
import {planetForVariant,growth} from '@/lib/activity/model';
import {useActivity} from '@/components/activity/use-activity';
import '@/components/activity/activity.css';
import WorldEntry from './activity/world-entry';
export default function CustomerPanel({variant='hot',worldEntryOpen=false,onWorldEntryClose=()=>{},regularHref}:{showAccountCharacter?:boolean;variant?:SiteVariant;worldEntryOpen?:boolean;onWorldEntryClose?:()=>void;regularHref?:string}){
 const [loggingOut,setLoggingOut]=useState(false),[logoutError,setLogoutError]=useState('');
 const planet=planetForVariant(variant),state=useActivity(planet);
 async function logout(){if(loggingOut)return;setLoggingOut(true);setLogoutError('');try{const {error}=await browserDb().auth.signOut({scope:'local'});if(error)throw error;window.location.reload()}catch{setLoggingOut(false);setLogoutError('로그아웃하지 못했어요. 다시 눌러 주세요.')}}
 return <><div className={`customer-trigger ${styles.actions}`}>
 {state.signedIn?<Button className="activity-trigger" variant="ghost" disabled={loggingOut} onClick={()=>location.assign('/account')} aria-label="내 계정"><UserRound size={18}/><span>내 계정</span>{state.data&&<b className="aw-mini-exp">LV.{growth(state.data.xp).level} · {state.data.xp.toLocaleString('ko-KR')} EXP</b>}</Button>:<nav className={styles.consumerEntry} aria-label="일반회원 가입 및 로그인"><a href="/account/join?type=user&returnTo=%2Faccount">일반회원 로그인</a><a href="/account/join?type=user&returnTo=%2Faccount" aria-label="일반회원 가입">회원가입</a></nav>}
 <a className={styles.mobileRegular} href={state.owner===true?'/owner/dashboard':'/account/join?type=owner&returnTo=%2Fowner%2Fdashboard'}>내 매장</a>
 {regularHref&&state.signedIn&&state.owner===false&&<RegularHomeLink variant={variant} className={styles.mobileRegular}>내 단골 목록</RegularHomeLink>}
 {state.signedIn&&<Button className={styles.logout} variant="ghost" disabled={loggingOut} onClick={()=>void logout()}><LogOut size={18}/><span>{loggingOut?'로그아웃 중':'로그아웃'}</span></Button>}
 {logoutError&&<span className={styles.error} role="alert">{logoutError}</span>}
 </div><WorldEntry planet={planet} state={state} open={worldEntryOpen&&(planet==='hot'||state.owner===false||state.signedIn===false)} onClose={onWorldEntryClose} onActivity={(tab='info')=>{onWorldEntryClose();location.assign('/account?tab='+encodeURIComponent(tab))}}/></>;
}
