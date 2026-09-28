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
export default function CustomerPanel({variant='hot',worldEntryOpen=false,onWorldEntryClose=()=>{}}:{variant?:SiteVariant;worldEntryOpen?:boolean;onWorldEntryClose?:()=>void}){const [open,setOpen]=useState(false),[activityTab,setActivityTab]=useState('info');const planet=planetForVariant(variant),state=useActivity(planet);return <><Button className="customer-trigger activity-trigger" variant="ghost" onClick={()=>{setActivityTab('info');setOpen(true);void state.refresh()}} aria-label="내 활동"><UserRound size={18}/><span>내 활동</span>{state.data&&<b className="aw-mini-exp">레벨 {growth(state.data.xp).level}</b>}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="aw-activity-dialog"><DialogTitle>내 활동</DialogTitle><DialogDescription>나의 행성에서 쌓인 캐릭터·레벨·EXP·훈장과 모든 기록</DialogDescription><ActivityWorld planet={planet} state={state} initialTab={activityTab}/></DialogContent></Dialog><WorldEntry planet={planet} state={state} open={worldEntryOpen&&state.signedIn===true&&!open} onClose={onWorldEntryClose} onActivity={(tab='info')=>{setActivityTab(tab);onWorldEntryClose();setOpen(true);void state.refresh()}}/></>}
