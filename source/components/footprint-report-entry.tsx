'use client';
import {useEffect,useState} from 'react';
import FlavorHeader from './flavor-header';
import HotApp from './hot-app';
import SourceCommunity from './source-community';
import {api,ApiError} from '@/lib/client';
import type {FootprintReportDraft} from '@/lib/footprint-report';
import type {SiteVariant} from '@/lib/site-config';
export default function FootprintReportEntry({visitId,variant}:{visitId:string;variant:SiteVariant}){
 const [draft,setDraft]=useState<FootprintReportDraft|null>(null),[error,setError]=useState(''),[login,setLogin]=useState(false);
 useEffect(()=>{let cancelled=false;void api<FootprintReportDraft>('/api/activity/footprint-draft?visitId='+encodeURIComponent(visitId)).then(data=>{if(!cancelled)setDraft(data)}).catch(error=>{if(!cancelled){setError(error instanceof Error?error.message:'발자국을 불러오지 못했어요.');setLogin(error instanceof ApiError&&error.status===401)}});return()=>{cancelled=true}},[visitId]);
 if(!draft)return <><FlavorHeader/><main className="terms-page"><h1>내 발자국으로 제보하기</h1><p role={error?'alert':'status'}>{error||'내 매장·메뉴·사진을 불러오고 있어요.'}</p>{login&&<a href="/account/join?type=user&returnTo=%2Faccount">로그인하고 발자국 보기</a>}<a href="/account?tab=visits">나의 발자국으로 돌아가기</a></main></>;
 if(draft.sourceStore)return <><FlavorHeader/><main className="terms-page" id="report"><h1>{draft.visit.shop} 메뉴 제보</h1><p>발자국의 메뉴와 사진을 가져왔어요. 가격·맵기·공개 동의를 확인하고 제보해 주세요.</p><SourceCommunity store={draft.sourceStore} initialReport={{menu:draft.visit.menu,photoUrl:draft.photoUrl}}/><a href="/account?tab=visits">나의 발자국으로 돌아가기</a></main></>;
 if(draft.visit.country!=='KR')return <><FlavorHeader/><main className="terms-page"><h1>해외 발자국 사진을 보관했어요</h1><p>해외 메뉴는 HOT에 소개된 매장 상세에서 사진·가격을 제보할 수 있어요. 지도에서 해당 매장을 선택해 주세요.</p><a href="/">HOT 지도에서 매장 찾기</a><a href="/account?tab=visits">나의 발자국으로 돌아가기</a></main></>;
 return <HotApp variant={variant} footprintDraft={draft}/>;
}
