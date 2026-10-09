import {headers} from 'next/headers';
import FlavorHeader from '@/components/flavor-header';
import OwnerSubscription from '@/components/owner/owner-subscription';
import {variantForHost} from '@/lib/site-config';
export const dynamic='force-dynamic';
export const metadata={title:'월 8,000원 지도 구독 | NOWGO',robots:{index:false,follow:false}};
export default async function Page(){return <><FlavorHeader/><OwnerSubscription variant={variantForHost((await headers()).get('host'))}/></>}
