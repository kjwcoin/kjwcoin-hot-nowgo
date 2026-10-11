import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';
import AppCharacter from '@/components/app-character';
import '../map/map.css';
import './character.css';
export const dynamic='force-dynamic';
export const metadata={title:'내 캐릭터 | NOWGO',robots:{index:false,follow:false}};
export default async function Page(){return <AppCharacter variant={variantForHost((await headers()).get('host'))}/>}
