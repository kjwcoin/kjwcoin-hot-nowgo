import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import FlavorHeader from '@/components/flavor-header';
import OwnerStoreManager from '@/components/owner-store-manager';
import {variantForHost} from '@/lib/site-config';
export const dynamic='force-dynamic';
export const metadata={title:'내 매장 대시보드 | NOWGO',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{link:string}>}){const {link}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(link))notFound();return <><FlavorHeader/><OwnerStoreManager variant={variantForHost((await headers()).get('host'))} linkId={link}/></>}
