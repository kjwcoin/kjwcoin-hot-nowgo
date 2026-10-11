import {headers} from 'next/headers';
import AppShell from '@/components/app-shell';
import {variantForHost} from '@/lib/site-config';
import './shell.css';
export const dynamic='force-dynamic';
export const metadata={title:'NOWGO SPACE',robots:{index:false,follow:false}};
export default async function Page(){return <AppShell variant={variantForHost((await headers()).get('host'))}/>}
