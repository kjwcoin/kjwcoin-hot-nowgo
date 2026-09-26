import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';

export const metadata={
 title:'나우고 RICH | 전국 크림·버터·치즈 지도',
 description:'느끼한 단계, 메뉴 종류와 예산으로 대한민국 전국의 크림·버터·치즈 한 접시를 찾아요.'
};

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer/>;
}
