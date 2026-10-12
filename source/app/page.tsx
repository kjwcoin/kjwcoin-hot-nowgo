import "@/components/sourced-store-minihome.css";
import {sourcePreviewEnabled,sourcePreviewStore} from '@/lib/source-store-preview';
import {flavorPageMetadata,flavorWebsite} from '@/lib/seo';
import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';

export async function generateMetadata(){if(sourcePreviewEnabled())return {title:'매장 카드 미리보기 | NOWGO HOT',robots:{index:false,follow:false}};return flavorPageMetadata((await headers()).get('host'),'/');}

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 if(sourcePreviewEnabled())return <MapExplorer variant="hot" previewStore={sourcePreviewStore()}/>;
 const {menu}=await searchParams;
 // Previously shared promotion links used the root URL.
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 const variant=variantForHost((await headers()).get('host'));
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(flavorWebsite(variant)).replace(/</g,'\\u003c')}}/><MapExplorer variant={variant}/></>;
}
