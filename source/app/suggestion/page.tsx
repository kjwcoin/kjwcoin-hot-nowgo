import {selectedReportingEnabled,HOT_REPORTING_PENDING_MESSAGE} from '@/lib/hot-reporting-phase';
import {flavorPageMetadata} from '@/lib/seo';
import FootprintReportEntry from '@/components/footprint-report-entry';
import HotApp from '@/components/hot-app';
import Link from 'next/link';
import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';

export async function generateMetadata(){return flavorPageMetadata((await headers()).get('host'),'/suggestion');}

export default async function SuggestionPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams;
  if(typeof query.footprint==='string'&&/^[a-f0-9-]{36}$/.test(query.footprint))return <FootprintReportEntry visitId={query.footprint} variant={variantForHost((await headers()).get('host'))}/>;
  // A direct selected-menu URL is an entrypoint too. Do not mount a photo form,
  // login flow or target/heat loaders while this release is facts-only.
  if((query.reportStore!==undefined||query.reportMenu!==undefined)&&!selectedReportingEnabled())return <main data-reporting-state="pending" style={{maxWidth:640,margin:'64px auto',padding:24}}>
    <h1>메뉴별 매운맛 평가 준비 중</h1><p role="status">{HOT_REPORTING_PENDING_MESSAGE}</p>
    <p>공개자료 매장 정보와 점주 소유권 신청은 매장 미니홈피에서 확인할 수 있어요.</p>
    <Link href="/">메뉴 지도로 돌아가기</Link>
  </main>;
  return <>
    <HotApp variant={variantForHost((await headers()).get('host'))}/>
    <footer aria-label="제보 페이지 약관" style={{display:'flex',justifyContent:'center',gap:18,padding:'20px 16px 28px',fontSize:13,color:'#5f5a53',background:'#fff'}}>
      <Link href="/signup-terms" style={{textDecoration:'underline',textUnderlineOffset:3}}>가입약관</Link>
      <Link href="/terms" style={{textDecoration:'underline',textUnderlineOffset:3}}>이용약관</Link>
    </footer>
  </>;
}
