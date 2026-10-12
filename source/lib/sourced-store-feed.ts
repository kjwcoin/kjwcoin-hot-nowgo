import {parseSourcedStoreFeed,type PublicSourcedStoreFeed} from './sourced-store.ts';
/** No new credentials or database access. The Space server owns publication. */
export async function readSourcedStoreFeed(signal?:AbortSignal):Promise<PublicSourcedStoreFeed>{
 if(process.env.NOWGO_UNCLAIMED_STORES_ENABLED!=='true')throw Error('source_feed_disabled');
 const response=await fetch('https://www.nowgo.space/api/nowgo/hot/sourced-stores',{
  cache:'no-store',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000),
 });
 if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('source_unavailable');
 return parseSourcedStoreFeed(await response.json());
}
