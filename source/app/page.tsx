import { socialMetadata } from "@/lib/social-preview";
import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';

export const metadata={
 title:"RICH | 맛잘알의 리치한 맛 지도",
 description:"크리미하고 버터리한 메뉴를 취향대로 찾아보세요.",
 ...socialMetadata("rich"),
};

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer/>;
}
