import {api} from './client';
import {growth,planetForVariant,type ActivitySnapshot} from './activity/model';
import type {SiteVariant} from './site-config';
export type ReportReceipt={id:string;previousXp:number|null};
export async function readReportGrowth(variant:SiteVariant,signal?:AbortSignal){
 const snapshot=await api<ActivitySnapshot>('/api/activity/snapshot',{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(3000)});
 if(snapshot.planet!==planetForVariant(variant)||!Number.isFinite(snapshot.xp)||snapshot.xp<0||!snapshot.profile)throw new Error('성장 기록을 다시 확인해 주세요.');
 return snapshot;
}
export function reportGrowth(xp:number,previousXp:number|null){
 const current=growth(xp),previous=previousXp===null?null:growth(previousXp);
 return {...current,previousLevel:previous?.level??null,levelUp:previous!==null&&current.level>previous.level,gainedXp:previousXp===null?null:Math.max(0,xp-previousXp),remainingXp:current.next-xp};
}
