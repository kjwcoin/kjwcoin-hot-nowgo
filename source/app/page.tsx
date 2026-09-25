import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';

export const metadata={title:'NOWGO | 맛잘알의 매운 메뉴 지도',description:'맵기, 메뉴, 한 끼 예산으로 전국의 매운 한 접시를 찾아요.'};

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 // Previously shared promotion links used the root URL.
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer/>;
}
