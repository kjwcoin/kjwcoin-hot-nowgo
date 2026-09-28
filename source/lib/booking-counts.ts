export const BOOKING_REFRESH_MS = 60_000;

// Unknown and event-free stores must never look like measured zeroes.
// Positive legacy counts already come from persisted waiting/called records.
export function liveWaitingCount(value: unknown, hasEvents?: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return null;
  if (hasEvents === false || (value === 0 && hasEvents !== true)) return null;
  return value;
}

export function waitingCountLabel(value: unknown, hasEvents?: unknown): string {
  const count = liveWaitingCount(value, hasEvents);
  return count === null ? '-' : `${count}팀`;
}
