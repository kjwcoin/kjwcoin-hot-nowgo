import {headers} from 'next/headers';
import AppReportLogin from '@/components/app-report-login';
import {variantForHost} from '@/lib/site-config';
export const dynamic='force-dynamic';
export const metadata={title:'앱 계정 연결 | NOWGO',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{channel?:string;role?:string;provider?:string;mode?:string;favoriteStoreId?:string}>}){
 const [params,h]=await Promise.all([searchParams,headers()]);
 return <AppReportLogin variant={variantForHost(h.get('host'))} channel={params.channel||''} role="customer" entry={params.mode==='entry'} character={params.mode==='character'} favoriteStoreId={params.mode==='entry'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(params.favoriteStoreId||'')?params.favoriteStoreId:undefined} provider={params.provider==='google'||params.provider==='kakao'||params.provider==='apple'?params.provider:undefined}/>;
}
