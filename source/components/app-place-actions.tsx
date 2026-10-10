'use client';
import {postAppEvent} from '@/lib/app-embed';
import type {SiteVariant} from '@/lib/site-config';
export default function AppPlaceActions({variant}:{variant:SiteVariant}){return <button type="button" className="submit-button" onClick={()=>postAppEvent({type:'nowgo:open-report',brand:variant})}>정보 제보하기</button>}
