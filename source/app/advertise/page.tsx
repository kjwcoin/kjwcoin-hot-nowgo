import FlavorHeader from '@/components/flavor-header';
import HotAdManager from '@/components/hot-ad-manager';
import '@/components/hot-ad-manager.css';
export const metadata={title:'우리 집 매운맛 · 지역 광고 | NOWGO HOT'};
export default function Advertise(){return <><FlavorHeader/><main className="hot-ad-page"><p className="ad-eyebrow">HOT · LOCAL AD</p><h1>내 주변, 맨 위 한 자리.<br/>우리 집 매운맛을 알리세요.</h1><p>대표 매운 상품 1개와 직접 갱신한 영업상태로 손님에게 알려 주세요.</p><div className="ad-summary"><div><strong>월 8,000원부터</strong><p>최저 입찰가 · VAT 별도<br/>낙찰 예산으로 1개월 단건 결제</p></div><div><strong>내 주변 광고 1곳</strong><p>현재 위치 15km 이내 선정 업체<br/>목록 맨 위 · 사진 왼쪽 위 ‘광고’</p></div><div><strong>최고 예산 업체 선정</strong><p>지역별 월 경쟁 입찰<br/>낙찰자만 결제 · 자동갱신 없음</p></div></div><ol><li>점주 통합 로그인과 사업자·매장 소유권 확인</li><li>사진·가격·위치·1~8단계가 있는 대표 매운 상품 1개 등록</li><li>지역과 노출 월 선택 → 광고 예산 입찰</li><li>마감 후 최고 예산 적격 업체 선정 → 24시간 내 결제</li><li>선정된 월 동안 인근 지도 목록 최상단 노출 · 영업상태 직접 갱신</li></ol><HotAdManager/></main></>}
