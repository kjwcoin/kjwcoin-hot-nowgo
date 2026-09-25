import MapExplorer from '@/components/map-explorer';
import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
import {EXPERIENCES,experienceFromHost} from '@/lib/experience';
import type {Metadata} from 'next';

export async function generateMetadata():Promise<Metadata>{
 const key=experienceFromHost((await headers()).get('host'));
 const profile=EXPERIENCES[key];
 return {title:`${profile.name} by NOWGO | ${profile.title}`,description:profile.description,alternates:{canonical:`https://${profile.host}/`}};
}

export default async function Page({searchParams}:{searchParams:Promise<{menu?:string}>}){
 const {menu}=await searchParams;
 const key=experienceFromHost((await headers()).get('host'));
 // Previously shared promotion links used the root URL.
 if(typeof menu==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu))redirect(`/suggestion?menu=${encodeURIComponent(menu)}`);
 return <MapExplorer experience={key}/>;
}
