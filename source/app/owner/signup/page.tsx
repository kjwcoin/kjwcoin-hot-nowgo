import {headers} from 'next/headers';
import records from '@/lib/readonly-source-records';
import FlavorHeader from '@/components/flavor-header';
import OwnerSignup from '@/components/owner/owner-signup';
import {variantForHost} from '@/lib/site-config';
export const dynamic='force-dynamic';
export const metadata={title:'지도 점주 가입 | NOWGO',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{sourceStore?:string}>}){const {sourceStore}=await searchParams;const record=records.find(row=>row.id===sourceStore);const initialStore=record?{id:record.id,name:record.name,address:record.address,menu:record.source_metadata.menus[0]?.name||''}:undefined;return <><FlavorHeader/><OwnerSignup initialStore={initialStore} variant={variantForHost((await headers()).get('host'))}/></>}
