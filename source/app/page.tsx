import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 // Previously shared promotion links used the root URL.
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer variant={variantForHost((await headers()).get('host'))}/>;
}
