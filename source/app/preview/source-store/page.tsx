import {notFound} from 'next/navigation';
import MapExplorer from '@/components/map-explorer';
import {sourcePreviewEnabled,sourcePreviewStore} from '@/lib/source-store-preview';
import '@/components/sourced-store-minihome.css';
export const metadata={title:'매장 카드 · 미니홈피 미리보기 | NOWGO HOT',robots:{index:false,follow:false}};
export default function SourceStorePreview(){
 if(!sourcePreviewEnabled())notFound();
 return <MapExplorer variant="hot" previewStore={sourcePreviewStore()}/>;
}
