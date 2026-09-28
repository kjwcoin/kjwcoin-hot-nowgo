'use client';
import {useState} from 'react';
import {UserRound} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import type {SiteVariant} from '@/lib/site-config';
import {planetForVariant,growth} from '@/lib/activity/model';
import dynamic from 'next/dynamic';
const ActivityWorld=dynamic(()=>import('@/components/activity/activity-world'));
import {useActivity} from '@/components/activity/use-activity';
import '@/components/activity/activity.css';
import WorldEntry from './activity/world-entry';
export default function CustomerPanel({variant='hot',worldEntryOpen=false,onWorldEntryClose=()=>{}}:{variant?:SiteVariant;worldEntryOpen?:boolean;onWorldEntryClose?:()=>void}){const [open,setOpen]=useState(false),[activityTab,setActivityTab]=useState('info');const planet=planetForVariant(variant),state=useActivity(planet);return <><Button className="customer-trigger activity-trigger" variant="ghost" disabled={state.signedIn===null} onClick={()=>{if(!state.signedIn){location.assign('/account/join?returnTo=%2F');return}setActivityTab('info');setOpen(true);void state.refresh()}} aria-label={state.signedIn?"내 활동":"통합회원가입/로그인"}><UserRound size={18}/><span>{state.signedIn===null?'계정 확인 중':state.signedIn?'내 활동':'통합회원가입/로그인'}</span>{state.data&&<b className="aw-mini-exp">레벨 {growth(state.data.xp).level}</b>}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="aw-activity-dialog"><DialogTitle>내 활동</DialogTitle><DialogDescription>나의 행성에서 쌓인 캐릭터·레벨·EXP·훈장과 모든 기록</DialogDescription><ActivityWorld planet={planet} state={state} initialTab={activityTab}/></DialogContent></Dialog><WorldEntry planet={planet} state={state} open={worldEntryOpen&&!open} onClose={onWorldEntryClose} onActivity={(tab='info')=>{setActivityTab(tab);onWorldEntryClose();setOpen(true);void state.refresh()}}/></>}
