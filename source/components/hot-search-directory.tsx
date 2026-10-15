import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {readHotSearchStores} from '@/lib/hot-search-directory';
import {SEARCH_PAGE_SIZE,nearbyPath,storeLocality} from '@/lib/hot-search';
import {HOT_DISCOVERY_ORIGIN,publicHotHost,serializeJsonLd} from '@/lib/store-discovery';
import {sourcedStoreUrl,BRAND_COMMON_MENU_NOTICE,isBrandCommonMenu} from '@/lib/sourced-store';
import {sourcePreviewEnabled} from '@/lib/source-store-preview';
import {variantForHost} from '@/lib/site-config';
import '@/app/nearby/search.css';
export type SearchProps={region?:string;page?:string};
async function readPage({region,page}:SearchProps){
 if(sourcePreviewEnabled()||variantForHost((await headers()).get('host'))!=='hot')notFound();
 const all=await readHotSearchStores();
 const stores=region?all.filter(store=>storeLocality(store.address)===region):all;
 if(region&&!stores.length)notFound();
 const number=page===undefined?1:Number(page);
 const pages=Math.max(1,Math.ceil(stores.length/SEARCH_PAGE_SIZE));
 if(!Number.isSafeInteger(number)||number<1||number>pages||(page!==undefined&&!/^[1-9]\d*$/.test(page)))notFound();
 return {all,stores,number,pages,visible:stores.slice((number-1)*SEARCH_PAGE_SIZE,number*SEARCH_PAGE_SIZE)};
}
export async function searchMetadata(props:SearchProps):Promise<Metadata>{
 const {number}=await readPage(props),host=(await headers()).get('host');
 const title=`${props.region?props.region+' ':''}내 주변 매운 맛집${number>1?' · '+number+'페이지':''} | 나우고 HOT`;
 const description=`${props.region||'전국'} 매운 맛집의 주소와 매운 메뉴를 확인하세요. 떡볶이·닭발·매운 국물 등 지도에 소개된 매장을 지역별로 찾아보고 방문 전 영업·품절 여부를 확인하는 나우고 HOT.`;
 const url=HOT_DISCOVERY_ORIGIN+nearbyPath(props.region,number);
 return {title,description,alternates:{canonical:url},robots:{index:publicHotHost(host),follow:true},openGraph:{title,description,url,type:'website',locale:'ko_KR'}};
}
export default async function HotSearchDirectory(props:SearchProps){
 const {all,stores,number,pages,visible}=await readPage(props);
 const regions=[...new Set(all.map(store=>storeLocality(store.address)))].sort((a,b)=>a.localeCompare(b,'ko'));
 const title=`${props.region?props.region+' ':''}내 주변 매운 맛집`;
 const url=HOT_DISCOVERY_ORIGIN+nearbyPath(props.region,number);
 const structured={'@context':'https://schema.org','@type':'CollectionPage',url,name:title,inLanguage:'ko-KR',mainEntity:{'@type':'ItemList',numberOfItems:visible.length,itemListElement:visible.map((store,index)=>({'@type':'ListItem',position:(number-1)*SEARCH_PAGE_SIZE+index+1,url:sourcedStoreUrl(store),name:store.name}))}};
 return <main className="hot-search-page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(structured)}}/><nav aria-label="경로"><Link href="/">HOT 지도</Link> / <Link href="/nearby">내 주변 매운 맛집</Link>{props.region&&<> / {props.region}</>}</nav><h1>{title}</h1><p>어디에서 매운 한 끼를 먹을까요? 주소와 메뉴로 가고 싶은 매장을 찾아보세요. 지도에서 내 위치를 허용하면 주변 매장을 확인할 수 있어요.</p><Link className="hot-search-map" href="/">내 주변 지도 열기 ↗</Link><details open={!props.region}><summary>지역별 매운 맛집 찾기</summary><nav className="hot-search-regions" aria-label="매장 지역">{regions.map(region=><Link key={region} href={nearbyPath(region)} aria-current={region===props.region?'page':undefined}>{region}</Link>)}</nav></details><p>공개 매장 {stores.length.toLocaleString('ko-KR')}곳 · {number} / {pages}페이지</p><p className="hot-search-notice">공공자료에 소개된 매장과 메뉴입니다. 점주 확인, 현재 영업·판매 여부, 가격과 맵기는 별도 확인이 필요합니다. 브랜드 공통 메뉴는 해당 지점의 판매를 뜻하지 않습니다.</p><section className="hot-search-cards" aria-label="매운 맛집 목록">{visible.map(store=><article key={store.id}><h2><Link href={sourcedStoreUrl(store)}>{store.name}</Link></h2><p>{store.address}</p><ul>{store.menus.map(menu=><li key={menu.id}>{menu.name}{isBrandCommonMenu(menu)&&<small> · {BRAND_COMMON_MENU_NOTICE}</small>}</li>)}</ul><Link href={sourcedStoreUrl(store)}>매장 카드 보기 ↗</Link></article>)}</section><nav className="hot-search-pagination" aria-label="목록 페이지">{number>1&&<Link rel="prev" href={nearbyPath(props.region,number-1)}>← 이전</Link>}{Array.from({length:pages},(_,i)=>i+1).map(page=><Link key={page} href={nearbyPath(props.region,page)} aria-current={page===number?'page':undefined}>{page}</Link>)}{number<pages&&<Link rel="next" href={nearbyPath(props.region,number+1)}>다음 →</Link>}</nav></main>;
}
