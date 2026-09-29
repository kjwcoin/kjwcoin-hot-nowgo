import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { variantForHost } from '@/lib/site-config';
import { flavorOrigins, publicFlavorHost } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
 const host = (await headers()).get('host');
 const origin = flavorOrigins[variantForHost(host)];
 if (!publicFlavorHost(host)) return { rules: { userAgent: '*', disallow: '/' } };
 return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/account', '/activity', '/sponsor-admin', '/go/'] }, sitemap: `${origin}/sitemap.xml` };
}
