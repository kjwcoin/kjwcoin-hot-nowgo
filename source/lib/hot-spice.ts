export type SpiceLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SpiceSummary = {
  menuId: string;
  median: number | null;
  count: number;
  provisional: boolean;
  myLevel: SpiceLevel | null;
};

export function isSpiceLevel(value: unknown): value is SpiceLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7;
}

export function isSpiceMenuId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Validate server summaries without deriving visitor ratings from owner heat. */
export function parseSpiceSummary(value: unknown, menuId: string): SpiceSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid_spice_summary');
  const row = value as Record<string, unknown>;
  const count = row.count, median = row.median;
  if (!isSpiceMenuId(menuId) || row.menuId !== menuId || typeof count !== 'number' ||
      !Number.isSafeInteger(count) || count < 0 ||
      (count === 0 ? median !== null : typeof median !== 'number' || !Number.isFinite(median) ||
        median < 1 || median > 7 || !Number.isInteger(median * 2) || (count % 2 === 1 && !Number.isInteger(median))) ||
      row.provisional !== (count > 0 && count < 3) ||
      (row.myLevel !== null && !isSpiceLevel(row.myLevel))) throw Error('invalid_spice_summary');
  return {menuId, median: median as number | null, count, provisional: row.provisional, myLevel: row.myLevel as SpiceLevel | null};
}
