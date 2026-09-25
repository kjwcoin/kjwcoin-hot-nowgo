import HotApp from '@/components/hot-app';
import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';

export default async function SuggestionPage() {
  return <HotApp variant={variantForHost((await headers()).get('host'))}/>;
}
