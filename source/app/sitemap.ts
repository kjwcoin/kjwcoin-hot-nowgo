import { sourcePreviewEnabled } from '@/lib/source-store-preview';
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { variantForHost } from '@/lib/site-config';
import { flavorOrigins, publicFlavorHost } from '@/lib/seo';
import { readLegacyPlaceIds } from '@/lib/store-discovery-catalog';
import { legacyStoreUrl, STORE_DISCOVERY_INDEXING_READY } from '@/lib/store-discovery';
import { readSourcedStoreFeed } from '@/lib/sourced-store-feed';
import { sourcedStoreUrl } from '@/lib/sourced-store';

export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (sourcePreviewEnabled()) return [];
  const host = (await headers()).get('host');
  if (!publicFlavorHost(host)) return [];
  const variant = variantForHost(host), origin = flavorOrigins[variant];
  const urls = new Set(['/', '/suggestion'].map(path => `${origin}${path}`));
  if (variant === 'hot' && STORE_DISCOVERY_INDEXING_READY) {
    for (const id of await readLegacyPlaceIds(variant)) urls.add(legacyStoreUrl(id, variant));
    if (process.env.NOWGO_UNCLAIMED_STORES_ENABLED === 'true') {
      const feed = await readSourcedStoreFeed();
      if (!feed.complete) throw Error('discovery_source_feed_incomplete');
      for (const store of feed.stores) urls.add(sourcedStoreUrl(store));
    }
  }
  // 4,000+ records fit a request-time sitemap. Never silently cut an oversized catalog.
  // Split into sitemap index + chunks before crossing the protocol's 50,000 URL limit.
  if (urls.size > 50000) throw Error('discovery_sitemap_requires_split');
  // checkedAt/asOf are source dates, not verifiable page modification timestamps.
  return [...urls].map(url => ({ url }));
}
