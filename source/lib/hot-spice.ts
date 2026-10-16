/**
 * HOT menu spice ratings.
 *
 * Independent of owner-declared heat levels: community results are computed
 * exclusively from verified, latest-per-member ratings.
 */
export type SpiceLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type MenuSpiceRating = {
  menuId: string;
  userId: string;
  level: number;
  updatedAt: string;
  valid?: boolean;
};

export type MenuSpiceSummary = {
  median: number | null;
  count: number;
  provisional: boolean;
};

export function isSpiceLevel(value: unknown): value is SpiceLevel {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8;
}

/** Median of an array of 1–8 heat levels. Throws for invalid input. */
export function spiceMedian(levels: readonly number[]): number | null {
  if (levels.some((level) => !isSpiceLevel(level))) {
    throw new RangeError("Spice ratings must be integers from 1 to 8.");
  }
  if (levels.length === 0) return null;
  const sorted = [...levels].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Includes only the latest valid submission per user for the target menu.
 * Caller must authorize and validate incoming records on the server.
 */
export function summarizeMenuSpiceRatings(
  menuId: string,
  ratings: readonly MenuSpiceRating[],
): MenuSpiceSummary {
  const latestByUser = new Map<string, MenuSpiceRating>();
  for (const rating of ratings) {
    if (rating.menuId !== menuId || rating.valid === false) continue;
    if (!rating.userId || !isSpiceLevel(rating.level)) continue;
    const time = Date.parse(rating.updatedAt);
    if (!Number.isFinite(time)) continue;
    const previous = latestByUser.get(rating.userId);
    if (!previous || time > Date.parse(previous.updatedAt)) {
      latestByUser.set(rating.userId, rating);
    }
  }
  const values = [...latestByUser.values()].map((rating) => rating.level);
  return {
    median: spiceMedian(values),
    count: values.length,
    provisional: values.length > 0 && values.length < 3,
  };
}
