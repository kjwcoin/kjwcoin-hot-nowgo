/** Phase one publishes sourced facts and ownership flows only.
 * Deliberately code-controlled: environment flags, owner verification and source
 * metadata cannot enable canonical reporting before a separately reviewed release.
 * The database draft-only phase guard remains authoritative as well.
 */
export type HotReportingState = 'pending' | 'enabled';
export const HOT_REPORTING_PENDING_MESSAGE = '메뉴별 매운맛 평가 등록과 집계는 준비 중이에요.';
export const HOT_REPORTING_PENDING_CODE = 'hot_reporting_pending';
export function selectedReportingEnabled(): boolean { return false; }
export function sourceReportingState(metadata: unknown): HotReportingState {
  if (!selectedReportingEnabled() || !metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'pending';
  const reporting = (metadata as Record<string, unknown>).reporting;
  if (!reporting || typeof reporting !== 'object' || Array.isArray(reporting)) return 'pending';
  return (reporting as Record<string, unknown>).state === 'enabled' ? 'enabled' : 'pending';
}
export function pendingMenuHeat() { return { state: 'pending' as const, scale: 7 as const, summaries: [] as [] }; }
