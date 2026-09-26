import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';

export const metadata={
 title:'SWEET | 맛잘알의 디저트 지도',
 description:'내가 좋아하는 달콤함을 골라요.',
 openGraph:{
  title:'SWEET | 맛잘알의 디저트 지도',
  description:'내가 좋아하는 달콤함을 골라요.',
  images:[{url:'https://sweet.nowgo.space/og/share-sweet-02-20260926-v2.jpg',width:1200,height:630,alt:'SWEET 맛잘알 공유 이미지'}]
 },
 twitter:{card:'summary_large_image' as const,title:'SWEET | 맛잘알의 디저트 지도',images:['https://sweet.nowgo.space/og/share-sweet-02-20260926-v2.jpg']}
};

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer/>;
}
