import {headers} from 'next/headers';
import FlavorHeader from '@/components/flavor-header';
import OwnerStoreManager from '@/components/owner-store-manager';
import {variantForHost} from '@/lib/site-config';
export const dynamic='force-dynamic';
export const metadata={title:'내 매장관리 | NOWGO 지도',robots:{index:false,follow:false}};
export default async function Page(){
 const variant=variantForHost((await headers()).get('host'));
 return <><FlavorHeader/><OwnerStoreManager variant={variant}/></>;
}
