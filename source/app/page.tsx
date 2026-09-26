import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';

export const metadata={
 title:'RICH | 맛잘알의 리치한 맛 지도',
 description:'크리미하고 버터리한 메뉴를 취향대로 찾아보세요.',
 openGraph:{
  title:'RICH | 맛잘알의 리치한 맛 지도',
  description:'크리미하고 버터리한 메뉴를 취향대로 찾아보세요.',
  images:[{url:'https://rich.nowgo.space/og/share-rich-03-20260926-v2.jpg',width:1200,height:630,alt:'RICH 맛잘알 공유 이미지'}]
 },
 twitter:{card:'summary_large_image' as const,title:'RICH | 맛잘알의 리치한 맛 지도',images:['https://rich.nowgo.space/og/share-rich-03-20260926-v2.jpg']}
};

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer/>;
}
