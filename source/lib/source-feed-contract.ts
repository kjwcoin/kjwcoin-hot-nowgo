/** Public feed contracts name explicit reviewed snapshots, never a count/prefix query.
 * Keep old contracts mapped to their reviewed records when adding a new release.
 */
export const SOURCE_FEED_CONTRACT_HEADER='X-NOWGO-Source-Contract';
export const LEGACY_SOURCE_FEED_CONTRACT='hot-source-130-v1';
export const PREVIOUS_SOURCE_FEED_CONTRACT='hot-source-588-v1';
export const CURRENT_SOURCE_FEED_CONTRACT='hot-source-591-v1';
export type SourceFeedContract=typeof LEGACY_SOURCE_FEED_CONTRACT|typeof PREVIOUS_SOURCE_FEED_CONTRACT|typeof CURRENT_SOURCE_FEED_CONTRACT;
/** Only the public HTTP boundary defaults missing headers to the live 130 client. */
export function resolveSourceFeedContract(value:string|null):SourceFeedContract|null{
 if(value===null||value===LEGACY_SOURCE_FEED_CONTRACT)return LEGACY_SOURCE_FEED_CONTRACT;
 if(value===PREVIOUS_SOURCE_FEED_CONTRACT)return PREVIOUS_SOURCE_FEED_CONTRACT;
 return value===CURRENT_SOURCE_FEED_CONTRACT?CURRENT_SOURCE_FEED_CONTRACT:null;
}
