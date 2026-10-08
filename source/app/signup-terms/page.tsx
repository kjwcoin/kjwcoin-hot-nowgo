import {headers} from 'next/headers';
import FlavorHeader from '@/components/flavor-header';
import {siteConfig,variantForHost} from '@/lib/site-config';

const signupTerms=[
  ['가입 대상과 계정','HOT·SWEET·RICH는 NOWGO 통합회원 계정을 사용합니다. 유저 또는 점주 유형을 선택해 가입하며, 같은 회원 ID로 저장·제보·매장관리 기능을 이용합니다. 점주 권한은 사업자와 매장 관리 권한 확인이 완료된 뒤 적용됩니다.'],
  ['필수 동의','가입을 위해 서비스 이용약관과 개인정보 처리 안내에 동의해야 합니다. 필수 동의를 거부하면 회원 전용 저장·제보·점주 기능을 이용할 수 없지만, 공개 메뉴 탐색은 가입 없이 이용할 수 있습니다.'],
  ['가입 정보','회원 식별자, 가입 유형, 로그인 제공자 계정 식별정보, 동의 이력과 서비스 이용 이력을 계정 유지, 로그인, 제보·저장 기능 제공, 부정 이용 방지와 문의 대응에 사용합니다. 점주 가입 시 매장과 사업자 확인에 필요한 정보가 추가로 처리될 수 있습니다.'],
  ['선택 동의','이벤트·혜택 등 광고성 정보 수신 동의는 선택 사항입니다. 선택 동의를 하지 않아도 가입과 기본 기능 이용에는 제한이 없습니다.'],
  ['계정과 권한','타인의 계정이나 사업자 정보를 사용하거나 허위 정보로 가입할 수 없습니다. 점주 권한, 매장 소유권, 제보 신뢰성 확인이 필요한 경우 추가 확인을 요청할 수 있습니다.'],
  ['점주 유료 기능 안내','공개 지도와 메뉴를 탐색할 수 있습니다. 내 매장관리는 주식회사 나우고의 월 8,000원(VAT 포함) Paddle 원화 정기결제가 확인된 점주에게 제공됩니다. 구독 신청 전에 금액·주기·결제일 등 조건을 안내하고 별도 동의를 받습니다.'],
  ['탈퇴와 기록','회원 탈퇴는 NOWGO 계정 정책에 따라 처리합니다. 탈퇴 후에는 관계 법령상 보존 의무가 있는 기록이나 분쟁 대응에 필요한 기록만 해당 기간 동안 보관하고 나머지는 삭제합니다.'],
];

export default async function SignupTerms(){
  const theme=siteConfig(variantForHost((await headers()).get('host')));
  return <>
    <FlavorHeader/>
    <main className="terms-page">
      <h1>{theme.name} 가입약관</h1>
      <p>HOT·SWEET·RICH 공통 가입 기준</p>
      {signupTerms.map(([title,body],i)=><section key={title}><h2>{i+1}. {title}</h2><p>{body}</p></section>)}
      <section><h2>8. 관련 약관</h2><p><a href="/terms">서비스 이용약관 보기</a> · <a href="https://www.nowgo.space/legal/privacy">NOWGO 개인정보 처리방침 보기</a></p></section>
    </main>
  </>;
}
