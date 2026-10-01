export const OWNER_STATES = [
  {value: 'open', label: '영업중'},
  {value: 'closed_for_day', label: '영업마감'},
  {value: 'ingredients_soldout', label: '재료소진 마감'},
  {value: 'temporary_closed', label: '임시휴무'},
  {value: 'break_time', label: '브레이크 타임'},
  {value: 'permanently_closed', label: '폐업'},
] as const;
export type OwnerState = typeof OWNER_STATES[number]['value'];
export type ExpiryMode = 'business_day' | 'manual';
export type Override = {kind: 'open_status' | 'congestion'; value: string; setAt: string; expiresAt: string};
export type OwnerStore = {
  id: string; name: string; address: string; slug: string;
  hours: {open?: string; close?: string; breakStart?: string | null; breakEnd?: string | null; text?: string} | null;
  penaltyPoints: number; disabled: boolean; canPublish: boolean;
  overrides: Override[];
  incidents: {id: string; kind: string; detectedAt: string; penaltyPoints: number; consensusCount: number}[];
};
export type OwnerSnapshot = {isOwner: boolean; stores: OwnerStore[]; checkedAt: string};
export function ownerTrustLevel(points: number) {
  const penalty = Math.min(30, Math.max(0, points));
  const score = 30 - penalty;
  return {penalty, score, level: Math.max(1, Math.ceil(score / 6)), suspended: score === 0};
}
export function businessDate(iso: string) {
  // NOWGO's operating day starts at 04:00 KST (19:00 UTC on the previous day).
  return new Date(Date.parse(iso) + 5 * 3600000).toISOString().slice(0, 10);
}
export function currentOverride(overrides: Override[], kind: Override['kind'], now: number) {
  return overrides.find(row => row.kind === kind && Date.parse(row.setAt) <= now &&
    Date.parse(row.expiresAt) > now && now - Date.parse(row.setAt) < 86400000) ?? null;
}
export function parseOwnerCommand(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.storeId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.storeId) ||
      typeof d.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.requestId) ||
      typeof d.active !== 'boolean' || !['manual', 'business_day'].includes(String(d.expiryMode))) return null;
  const valid = d.kind === 'open_status' ? OWNER_STATES.some(s => s.value === d.value)
    : d.kind === 'congestion' && ['full', 'available'].includes(String(d.value));
  if (!valid) return null;
  return {storeId: d.storeId, requestId: d.requestId, kind: d.kind as Override['kind'], value: String(d.value), active: d.active, expiryMode: d.expiryMode as ExpiryMode};
}
