import FlavorHeader from '@/components/flavor-header';
import CustomerPanel from '@/components/customer-panel';
import {headers} from 'next/headers';
import {siteConfig,variantForHost} from '@/lib/site-config';
export default async function Account(){const variant=variantForHost((await headers()).get('host')),theme=siteConfig(variant);return <><FlavorHeader/><main className="terms-page"><h1>하나의 계정으로<br/>이어지는 나의 맛 기록.</h1><p>{theme.name}에서 통합회원으로 가입하고 NOWGO에서 같은 계정으로 매장을 관리합니다. 확인된 NOWGO 매장 페이지로 이어집니다.</p><CustomerPanel variant={variant}/><p>공식 점주로 제보하려면 NOWGO에서 매장 관리 권한을 확인해 주세요.</p><section><h2>설정 및 구독</h2><p>통합회원 탈퇴 시 모든 연결 매장과 스페이스·지도 월 구독이 함께 종료됩니다.</p><p><a href="https://nowgo.space/owner/settings">설정 및 구독 관리</a> · <a href="https://nowgo.space/account/withdraw">회원탈퇴 · 전체 서비스 종료</a></p></section><a href="/">메뉴 지도로 돌아가기 ↗</a></main></>}
