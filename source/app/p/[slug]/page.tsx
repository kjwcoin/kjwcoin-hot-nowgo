import '@/app/nearby/search.css';
import {nearbyPath,storeLocality} from '@/lib/hot-search';
import {sourceFactsNotice} from '@/lib/store-discovery';
import {BRAND_COMMON_MENU_NOTICE,isBrandCommonMenu} from '@/lib/sourced-store';
import {publicDb} from '@/lib/supabase';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import SourcedStoreMinihome from '@/components/sourced-store-minihome';
import {readSourcedStoreBySlug} from '@/lib/sourced-store-page';
import {sourcePreviewEnabled,sourcePreviewStore} from '@/lib/source-store-preview';
import {sourcedStoreMetadata,sourcedStoreJsonLd,serializeJsonLd} from '@/lib/store-discovery';
import {variantForHost} from '@/lib/site-config';
type Props={params:Promise<{slug:string}>;searchParams:Promise<{preview?:string}>};
async function resolvePage({params,searchParams}:Props){
 const [{slug},query]=await Promise.all([params,searchParams]);
 const preview=query.preview==='source'&&sourcePreviewEnabled();
 if(query.preview&&!preview)notFound();
 if(preview){const store=sourcePreviewStore();if(slug!==store.slug)notFound();return {store,preview:true}}
 if(sourcePreviewEnabled())notFound();
 if(variantForHost((await headers()).get('host'))!=='hot')notFound();
 const store=await readSourcedStoreBySlug(slug);if(!store)notFound();const hidden=await publicDb().rpc('ng_hot_source_hidden_stores');if(hidden.error)throw Error('store_visibility_unavailable');if((hidden.data||[]).includes(store.id))notFound();return {store,preview:false};
}
export async function generateMetadata(props:Props){
 const {store,preview}=await resolvePage(props),metadata=sourcedStoreMetadata(store,(await headers()).get('host'));
 return preview?{...metadata,title:`미리보기 · ${store.name} | NOWGO HOT`,alternates:undefined,openGraph:{...metadata.openGraph,url:undefined},robots:{index:false,follow:false}}:metadata;
}
export default async function Page(props:Props){
 const {store,preview}=await resolvePage(props);
 return <>{!preview&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(sourcedStoreJsonLd(store))}}/>}<SourcedStoreMinihome store={store} preview={preview}/>{!preview&&<section className="hot-search-summary" aria-label="매장 주소와 메뉴"><nav><a href="/nearby">내 주변 매운 맛집</a> / <a href={nearbyPath(storeLocality(store.address))}>{storeLocality(store.address)} 매운 맛집</a></nav><h1>{store.name}</h1><dl><dt>주소</dt><dd>{store.address}</dd>{store.coordinates&&<><dt>위치</dt><dd>위도 {store.coordinates.lat} · 경도 {store.coordinates.lon}</dd></>}</dl><h2>공개자료 메뉴</h2><ul>{store.menus.map(menu=><li key={menu.id}>{menu.name}{isBrandCommonMenu(menu)&&<small> · {BRAND_COMMON_MENU_NOTICE}</small>}{menu.provenance?.preparationNotice&&<p>{menu.provenance.preparationNotice}</p>}</li>)}</ul><p>{sourceFactsNotice(store)}</p><a href={store.source.url} target="_blank" rel="noreferrer">매장 정보 출처 ↗</a></section>}</>;
}
