import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';
import {planetForVariant} from '@/lib/activity/model';
import ActivityPage from '@/components/activity/activity-page';
export const metadata={title:'내 계정 | NOWGO',robots:{index:false,follow:false}};
export default async function Account(){return <ActivityPage account planet={planetForVariant(variantForHost((await headers()).get('host')))}/>;}
