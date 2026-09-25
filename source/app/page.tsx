import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';

export const metadata={
 title:'나우고 SWEET | 전국 카페·디저트 지도',
 description:'스윗한 단계, 디저트 종류, 예산으로 대한민국 전국의 카페·베이커리·디저트를 찾아요.'
};

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer/>;
}
