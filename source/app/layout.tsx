import type { Metadata } from "next";
import {headers} from 'next/headers';
import {siteConfig,variantForHost} from '@/lib/site-config';
import "./globals.css";

export async function generateMetadata():Promise<Metadata>{
 const variant=variantForHost((await headers()).get('host'));
 const theme=siteConfig(variant);
 const isRich=variant==='rich';
 const domain=isRich?'rich.nowgo.space':'hot.nowgo.space';
 const image=isRich?'/og/share-rich-03-20260926-v2.jpg':'/og/share-hot-01-20260926-v2.jpg';
 const socialTitle=isRich?'RICH | 맛잘알의 리치한 맛 지도':'HOT | 맛잘알의 매운맛 지도';
 const socialDescription=isRich
  ?'크리미하고 버터리한 메뉴를 취향대로 찾아보세요.'
  :'취향에 맞는 매운 메뉴를 찾아보세요.';
 return {
  metadataBase:new URL(`https://${domain}`),
  title:`${theme.name} by NOWGO | ${theme.headline}`,
  description:theme.intro,
  openGraph:{type:'website',locale:'ko_KR',siteName:`NOWGO ${theme.name}`,url:'/',
   title:socialTitle,description:socialDescription,
   images:[{url:image,width:1200,height:630,alt:`${socialTitle} 공유 이미지`}]},
  twitter:{card:'summary_large_image',title:socialTitle,description:socialDescription,images:[image]},
  icons:{icon:{url:theme.favicon,type:'image/png'},shortcut:theme.favicon,apple:theme.favicon}
 };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased" data-theme={variantForHost((await headers()).get('host'))}>{children}</body>
    </html>
  );
}
