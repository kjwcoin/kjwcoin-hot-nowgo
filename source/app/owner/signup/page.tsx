import {headers} from 'next/headers';
import FlavorHeader from '@/components/flavor-header';
import OwnerSignup from '@/components/owner/owner-signup';
import {variantForHost} from '@/lib/site-config';
export const dynamic='force-dynamic';
export const metadata={title:'지도 점주 가입 | NOWGO',robots:{index:false,follow:false}};
export default async function Page(){return <><FlavorHeader/><OwnerSignup variant={variantForHost((await headers()).get('host'))}/></>}
