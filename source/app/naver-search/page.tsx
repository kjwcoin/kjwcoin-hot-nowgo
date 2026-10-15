import NaverReferenceSearch from '@/components/naver-reference-search';
import FlavorHeader from '@/components/flavor-header';

export const metadata={title:'NAVER 검색 참고자료 | NOWGO HOT',robots:{index:false,follow:true}};
export default function NaverSearchPage(){
 return <><FlavorHeader/><NaverReferenceSearch/></>;
}
