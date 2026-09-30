import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { variantForHost } from '@/lib/site-config';
import { flavorOrigins, publicFlavorHost } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 const host = (await headers()).get('host');
 if (!publicFlavorHost(host)) return [];
 const origin = flavorOrigins[variantForHost(host)];
 // Customer profiles, temporary query links and demo stores are not search pages.
 return ['/', '/suggestion'].map(path => ({ url: `${origin}${path}` }));
}
