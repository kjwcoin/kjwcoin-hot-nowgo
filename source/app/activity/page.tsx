import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';
import {planetForVariant} from '@/lib/activity/model';
import ActivityPage from '@/components/activity/activity-page';
export const metadata={title:'내 활동 | NOWGO',robots:{index:false,follow:false}};
export default async function Page(){return <ActivityPage planet={planetForVariant(variantForHost((await headers()).get('host')))}/>}
