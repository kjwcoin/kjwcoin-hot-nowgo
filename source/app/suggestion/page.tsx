import HotApp from '@/components/hot-app';
import {headers} from 'next/headers';
import {EXPERIENCES,experienceFromHost} from '@/lib/experience';
import type {Metadata} from 'next';

export async function generateMetadata():Promise<Metadata>{
 const profile=EXPERIENCES[experienceFromHost((await headers()).get('host'))];
 return {title:`${profile.name} by NOWGO | ${profile.title}`,description:profile.description,alternates:{canonical:`https://${profile.host}/suggestion`}};
}

export default async function SuggestionPage() {
 const key=experienceFromHost((await headers()).get('host'));
 return <HotApp experience={key}/>;
}
