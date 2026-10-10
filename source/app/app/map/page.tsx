import {headers} from 'next/headers';
import AppMap from '@/components/app-map';
import {variantForHost} from '@/lib/site-config';
import './map.css';
export const dynamic='force-dynamic';
export const metadata={title:'맛의 행성 지도 | NOWGO',robots:{index:false,follow:false}};
export default async function Page(){return <AppMap variant={variantForHost((await headers()).get('host'))}/>}
