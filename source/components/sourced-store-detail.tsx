'use client';
import {Button} from '@/components/ui/button';
import type {PreviewHeatSummary} from '@/components/preview-menu-heat';
import type {SourcePreviewPhoto} from '@/components/sourced-store-photo';
import type {PublicSourcedStore} from '@/lib/sourced-store';

type Props={store:PublicSourcedStore;preview?:boolean;menuId?:string|null;onBack:()=>void;previewHeat?:PreviewHeatSummary;onPreviewHeat?:(menuId:string,heat:number)=>void;onPreviewHeatReset?:()=>void;previewPhoto?:SourcePreviewPhoto;onPreviewPhoto?:(menuId:string,file:File,nickname:string)=>void;onPreviewPhotoReset?:()=>void;previewFavorite?:boolean;onPreviewFavoriteToggle?:()=>void};

/** Keep a selected map pin focused on the two facts people need: address and spicy menus. */
export default function SourcedStoreDetail({store,preview=false,menuId,onBack}:Props){
 const selected=store.menus.find(menu=>menu.id===menuId);
 const menus=selected?[selected,...store.menus.filter(menu=>menu.id!==selected.id)]:store.menus;
 return <article className="explorer-selected source-store-detail source-store-detail--simple" data-store-id={store.id} data-preview={preview?'true':undefined}>
  <Button variant="ghost" className="explorer-back" onClick={onBack}>← 메뉴 목록</Button>
  <div className="explorer-detail-content">
   <h1>{store.name}</h1>
   <section className="source-simple-fact" aria-labelledby={`address-${store.id}`}>
    <h2 id={`address-${store.id}`}>주소</h2>
    <p>{store.address}</p>
   </section>
   <section className="source-simple-fact" aria-labelledby={`menus-${store.id}`}>
    <h2 id={`menus-${store.id}`}>매운 메뉴</h2>
    {menus.length?<ul>{menus.map(menu=><li key={menu.id}>{menu.name}</li>)}</ul>:<p>등록된 매운 메뉴가 없어요.</p>}
   </section>
  </div>
 </article>;
}
