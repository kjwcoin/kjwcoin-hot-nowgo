'use client';
import {useState} from 'react';
import {UserRound, LogOut} from 'lucide-react';
import {browserDb} from '@/lib/supabase-browser';
import styles from './customer-account.module.css';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import type {SiteVariant} from '@/lib/site-config';
import {planetForVariant,growth} from '@/lib/activity/model';
import dynamic from 'next/dynamic';
const ActivityWorld=dynamic(()=>import('@/components/activity/activity-world'));
import {useActivity} from '@/components/activity/use-activity';
import '@/components/activity/activity.css';
import WorldEntry from './activity/world-entry';
export default function CustomerPanel({variant='hot',worldEntryOpen=false,onWorldEntryClose=()=>{},regularHref}:{variant?:SiteVariant;worldEntryOpen?:boolean;onWorldEntryClose?:()=>void;regularHref?:string}){const [open,setOpen]=useState(false),[activityTab,setActivityTab]=useState('info'),[loggingOut,setLoggingOut]=useState(false),[logoutError,setLogoutError]=useState('');
async function logout(){if(loggingOut)return;setLoggingOut(true);setLogoutError('');try{const {error}=await browserDb().auth.signOut({scope:'local'});if(error)throw error;window.location.reload()}catch{setLoggingOut(false);setLogoutError('로그아웃하지 못했어요. 다시 눌러 주세요.')}}
const planet=planetForVariant(variant),state=useActivity(planet);return <><div className={`customer-trigger ${styles.actions}`}><Button className="activity-trigger" variant="ghost" disabled={state.signedIn===null||loggingOut} onClick={()=>{if(!state.signedIn){location.assign('/account/join?returnTo=%2F');return}setActivityTab('info');setOpen(true);void state.refresh()}} aria-label={state.signedIn===null?"계정 확인 중":state.signedIn?"내 활동":"통합회원가입/로그인"}><UserRound size={18}/><span>{state.signedIn===null?'계정 확인 중':state.signedIn?'내 활동':'통합회원가입/로그인'}</span>{state.data&&<b className="aw-mini-exp">레벨 {growth(state.data.xp).level}</b>}</Button>{regularHref&&<a className={styles.mobileRegular} href={regularHref}>내 단골 목록</a>}{state.signedIn&&<Button className={styles.logout} variant="ghost" disabled={loggingOut} onClick={()=>void logout()}><LogOut size={18}/><span>{loggingOut?'로그아웃 중':'로그아웃'}</span></Button>}{logoutError&&<span className={styles.error} role="alert">{logoutError}</span>}</div><Dialog open={open} onOpenChange={setOpen}><DialogContent className="aw-activity-dialog"><DialogTitle>내 활동</DialogTitle><DialogDescription>나의 행성에서 쌓인 캐릭터·레벨·EXP·훈장과 모든 기록</DialogDescription><ActivityWorld planet={planet} state={state} initialTab={activityTab}/></DialogContent></Dialog><WorldEntry planet={planet} state={state} open={worldEntryOpen&&!open} onClose={onWorldEntryClose} onActivity={(tab='info')=>{setActivityTab(tab);onWorldEntryClose();setOpen(true);void state.refresh()}}/></>}
