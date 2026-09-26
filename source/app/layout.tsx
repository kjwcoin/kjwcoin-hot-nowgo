import { socialMetadata } from "@/lib/social-preview";
import type { Metadata } from "next";
import {headers} from 'next/headers';
import {siteConfig,variantForHost} from '@/lib/site-config';
import "./globals.css";

export async function generateMetadata():Promise<Metadata>{
 const variant=variantForHost((await headers()).get('host'));
 const theme=siteConfig(variant);
 return {
  ...socialMetadata(variant),
  title:`${theme.name} by NOWGO | ${theme.headline}`,
  description:theme.intro,
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
