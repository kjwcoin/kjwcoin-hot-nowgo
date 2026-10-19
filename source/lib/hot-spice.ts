/**
 * HOT menu spice ratings.
 *
 * Independent of owner-declared heat levels: community results are computed
 * exclusively from verified, latest-per-member ratings.
 */
export type SpiceLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7;
}

/** Median of an array of 1–7 heat levels. Throws for invalid input. */
export function spiceMedian(levels: readonly number[]): number | null {
  if (levels.some((level) => !isSpiceLevel(level))) {
    throw new RangeError("Spice ratings must be integers from 1 to 7.");
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
  const latestByUser = new Map<string, {
    rating: MenuSpiceRating;
    time: number;
    ambiguous: boolean;
  }>();
  for (const rating of ratings) {
    if (rating.menuId !== menuId || (rating.valid !== undefined && rating.valid !== true)) continue;
    // Reject malformed runtime records rather than treating them as distinct voters.
    if (typeof rating.userId !== "string" || !rating.userId.trim() || rating.userId !== rating.userId.trim() || !isSpiceLevel(rating.level)) continue;
    const time = Date.parse(rating.updatedAt);
    if (!Number.isFinite(time)) continue;
    const previous = latestByUser.get(rating.userId);
    if (!previous || time > previous.time) {
      latestByUser.set(rating.userId, { rating, time, ambiguous: false });
    } else if (time === previous.time && rating.level !== previous.rating.level) {
      // Conflicting rows at the same latest instant have no trustworthy winner.
      // Exclude that user until a strictly newer rating resolves the conflict.
      previous.ambiguous = true;
    }
  }
  const values = [...latestByUser.values()]
    .filter(({ ambiguous }) => !ambiguous)
    .map(({ rating }) => rating.level);
  return {
    median: spiceMedian(values),
    count: values.length,
    provisional: values.length > 0 && values.length < 3,
  };
}
