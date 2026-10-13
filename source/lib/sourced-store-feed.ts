import {parseSourcedStoreFeed,type PublicSourcedStoreFeed} from './sourced-store.ts';
import {readonlySourceStoreFeed} from './readonly-source-listings.ts';
/** Reviewed source manifest with field-level reuse bases; no SPACE fetch or database write. */
export async function readSourcedStoreFeed(signal?:AbortSignal):Promise<PublicSourcedStoreFeed>{
 if(process.env.NOWGO_UNCLAIMED_STORES_ENABLED!=='true')throw Error('source_feed_disabled');
 if(signal?.aborted)throw signal.reason||Error('aborted');
 return parseSourcedStoreFeed(readonlySourceStoreFeed());
}
