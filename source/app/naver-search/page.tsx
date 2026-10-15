import NaverReferenceSearch from '@/components/naver-reference-search';
import FlavorHeader from '@/components/flavor-header';

export const metadata={title:'네이버 검색 기능 중단 | NOWGO HOT',robots:{index:false,follow:true}};
export default function NaverSearchPage(){
 return <><FlavorHeader/><NaverReferenceSearch/></>;
}
