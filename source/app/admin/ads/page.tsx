import FlavorHeader from '@/components/flavor-header';
import HotAdManager from '@/components/hot-ad-manager';
export const metadata={title:'HOT 광고 운영 관리자',robots:{index:false,follow:false}};
export default function AdAdmin(){return <><FlavorHeader/><main className="hot-ad-page"><p className="ad-eyebrow">NOWGO · AD OPERATIONS</p><h1>지역 광고 운영</h1><p>모집 → 적격 입찰 확인 → 최고 예산 선정 → 결제 확인 → 월 노출 → 종료</p><HotAdManager admin/></main></>}
