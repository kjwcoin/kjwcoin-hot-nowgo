import {flavorPageMetadata} from '@/lib/seo';
import HotApp from '@/components/hot-app';
import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';

export async function generateMetadata(){return flavorPageMetadata((await headers()).get('host'),'/suggestion');}

export default async function SuggestionPage() {
  return <HotApp variant={variantForHost((await headers()).get('host'))}/>;
}
