import { publicDb, publicConfig } from './supabase';
import { siteConfig, type SiteVariant } from './site-config';

export type DiscoveryMenuRow = { id: string; place_id: string; shop: string };
export type DiscoveryBatch = { rows: DiscoveryMenuRow[]; total: number };
export const DISCOVERY_BATCH_SIZE = 500;

/** Injectable, count-checked paging: partial reads never become a complete sitemap. */
export async function collectLegacyPlaceIds(readBatch: (offset: number, size: number) => Promise<DiscoveryBatch>): Promise<string[]> {
  const places = new Set<string>();
  const seenRows = new Set<string>();
  let offset = 0, expectedTotal: number | undefined;
  while (true) {
    const { rows, total } = await readBatch(offset, DISCOVERY_BATCH_SIZE);
    if (!Number.isSafeInteger(total) || total < 0 || (expectedTotal !== undefined && total !== expectedTotal)) throw Error('discovery_catalog_changed');
    expectedTotal = total;
    if (!Array.isArray(rows) || rows.length > DISCOVERY_BATCH_SIZE || (!rows.length && offset < total)) throw Error('discovery_catalog_incomplete');
    for (const row of rows) {
      if (typeof row.id !== 'string' || seenRows.has(row.id)) throw Error('discovery_catalog_changed');
      seenRows.add(row.id);
      if (typeof row.place_id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(row.place_id) || typeof row.shop !== 'string') throw Error('invalid_discovery_row');
      if (!['나우고', '나우고 카페'].includes(row.shop.trim())) places.add(row.place_id);
    }
    offset += rows.length;
    if (offset > total) throw Error('discovery_catalog_changed');
    if (offset === total) return [...places].sort();
    // Continue even when a server's per-request row cap is smaller than our batch.
  }
}

export async function readLegacyPlaceIds(variant: SiteVariant): Promise<string[]> {
  if (!publicConfig().ready) throw Error('discovery_catalog_unavailable');
  const db = publicDb();
  return collectLegacyPlaceIds(async (offset, size) => {
    const { data, count, error } = await db.from(siteConfig(variant).tables.menus)
      .select('id,place_id,shop', { count: 'exact' })
      .order('id', { ascending: true }).range(offset, offset + size - 1)
      .abortSignal(AbortSignal.timeout(8000));
    if (error || count === null) throw Error('discovery_catalog_unavailable');
    return { rows: (data || []) as DiscoveryMenuRow[], total: count };
  });
}
