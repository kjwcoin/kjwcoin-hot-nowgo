import { socialMetadata } from "@/lib/social-preview";
import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';

export const metadata={
 title:"SWEET | 맛잘알의 디저트 지도",
 description:"내가 좋아하는 달콤함을 골라요.",
 ...socialMetadata("sweet"),
};

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer/>;
}
