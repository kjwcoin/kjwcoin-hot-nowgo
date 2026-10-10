import {headers} from 'next/headers';
import HotApp from '@/components/hot-app';
import {variantForHost} from '@/lib/site-config';
import './report.css';
export const dynamic='force-dynamic';
export const metadata={title:'매장·메뉴 제보 | NOWGO',robots:{index:false,follow:false}};
export default async function AppReport(){
 const requestHeaders=await headers();
 return <HotApp variant={variantForHost(requestHeaders.get('host'))} embeddedRole="customer"/>;
}
