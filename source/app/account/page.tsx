import Brand from '@/components/brand';
import CustomerPanel from '@/components/customer-panel';
import {headers} from 'next/headers';
import Link from 'next/link';
import {EXPERIENCES,experienceFromHost} from '@/lib/experience';
export default async function Account(){const key=experienceFromHost((await headers()).get('host')),name=EXPERIENCES[key].name;return <main className="terms-page" data-experience={key}><Brand experience={key}/><h1>하나의 계정으로<br/>이어지는 나의 맛부심.</h1><p>{name}에서 통합회원으로 가입하고 NOWGO에서 같은 계정으로 매장을 관리합니다. {name}의 메뉴 제보에서 확인된 NOWGO 매장 페이지로 이어집니다.</p><Link className="text-link" href="/account/join?returnTo=%2Fsuggestion%23report">{name}에서 통합회원 가입·로그인 ↗</Link><CustomerPanel experience={key}/><p>공식 점주로 제보하려면 NOWGO에서 매장 관리 권한을 확인해 주세요.</p><Link href="/">메뉴 지도로 돌아가기 ↗</Link></main>}
