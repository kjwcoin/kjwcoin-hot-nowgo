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
 const store=await readSourcedStoreBySlug(slug);if(!store)notFound();return {store,preview:false};
}
export async function generateMetadata(props:Props){
 const {store,preview}=await resolvePage(props),metadata=sourcedStoreMetadata(store,(await headers()).get('host'));
 return preview?{...metadata,title:`미리보기 · ${store.name} | NOWGO HOT`,alternates:undefined,openGraph:{...metadata.openGraph,url:undefined},robots:{index:false,follow:false}}:metadata;
}
export default async function Page(props:Props){
 const {store,preview}=await resolvePage(props);
 return <>{!preview&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(sourcedStoreJsonLd(store))}}/>}<SourcedStoreMinihome store={store} preview={preview}/></>;
}
