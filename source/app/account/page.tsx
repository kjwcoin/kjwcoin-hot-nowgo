import Brand from '@/components/brand';
import CustomerPanel from '@/components/customer-panel';
import {headers} from 'next/headers';
import {siteConfig,variantForHost} from '@/lib/site-config';
export default async function Account(){const variant=variantForHost((await headers()).get('host')),theme=siteConfig(variant);return <main className="terms-page"><Brand/><h1>하나의 계정으로<br/>이어지는 나의 맛 기록.</h1><p>{theme.name}에서 통합회원으로 가입하고 NOWGO에서 같은 계정으로 매장을 관리합니다. 확인된 NOWGO 매장 페이지로 이어집니다.</p><a className="text-link" href="/account/join?returnTo=%2Fsuggestion%23report">{theme.name}에서 통합회원 가입·로그인 ↗</a><CustomerPanel variant={variant}/><p>공식 점주로 제보하려면 NOWGO에서 매장 관리 권한을 확인해 주세요.</p><a href="/">메뉴 지도로 돌아가기 ↗</a></main>}
