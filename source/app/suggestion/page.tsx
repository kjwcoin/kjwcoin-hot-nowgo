import {flavorPageMetadata} from '@/lib/seo';
import HotApp from '@/components/hot-app';
import Link from 'next/link';
import {headers} from 'next/headers';
import {variantForHost} from '@/lib/site-config';

export async function generateMetadata(){return flavorPageMetadata((await headers()).get('host'),'/suggestion');}

export default async function SuggestionPage() {
  return <>
    <HotApp variant={variantForHost((await headers()).get('host'))}/>
    <footer aria-label="제보 페이지 약관" style={{display:'flex',justifyContent:'center',gap:18,padding:'20px 16px 28px',fontSize:13,color:'#5f5a53',background:'#fff'}}>
      <Link href="/signup-terms" style={{textDecoration:'underline',textUnderlineOffset:3}}>가입약관</Link>
      <Link href="/terms" style={{textDecoration:'underline',textUnderlineOffset:3}}>이용약관</Link>
    </footer>
  </>;
}
