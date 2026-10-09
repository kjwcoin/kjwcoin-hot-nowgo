import {headers} from 'next/headers';
import FlavorHeader from '@/components/flavor-header';
import OwnerStoreManager from '@/components/owner-store-manager';
import {variantForHost} from '@/lib/site-config';
export const dynamic='force-dynamic';
export const metadata={title:'매장 대시보드 | NOWGO 지도',robots:{index:false,follow:false}};
export default async function Page(){return <><FlavorHeader/><OwnerStoreManager variant={variantForHost((await headers()).get('host'))}/></>}
