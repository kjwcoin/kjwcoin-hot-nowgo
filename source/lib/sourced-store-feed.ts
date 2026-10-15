import {CURRENT_SOURCE_FEED_CONTRACT,type SourceFeedContract} from './source-feed-contract.ts';
import {createHash} from 'node:crypto';
import {isSourceOnlyFeed,parseSourcedStoreFeed,type PublicSourcedStoreFeed} from './sourced-store.ts';
import {readonlySourceStoreFeed} from './readonly-source-listings.ts';
// Only exact objects produced by the immutable reader are eligible. A future
// database/owner reader cannot gain conditional reuse just by resembling a source.
const readonlySnapshots=new WeakMap<PublicSourcedStoreFeed,{body:string;contract:SourceFeedContract}>();
/** Reviewed source manifest with field-level reuse bases; no SPACE fetch or database write. */
export async function readSourcedStoreFeed(signal?:AbortSignal,contract:SourceFeedContract=CURRENT_SOURCE_FEED_CONTRACT):Promise<PublicSourcedStoreFeed>{
 if(process.env.NOWGO_UNCLAIMED_STORES_ENABLED!=='true')throw Error('source_feed_disabled');
 if(signal?.aborted)throw signal.reason||Error('aborted');
 const feed=parseSourcedStoreFeed(readonlySourceStoreFeed(contract));
 if(feed.complete&&isSourceOnlyFeed(feed))readonlySnapshots.set(feed,{body:JSON.stringify(feed),contract});
 return feed;
}
/** Content-derived release version, scoped to origin/host. Weak so transport
 * compression may vary without asserting byte identity of a content encoding. */
export function sourcedStoreFeedEtag(feed:PublicSourcedStoreFeed,scope:string,contract:SourceFeedContract=CURRENT_SOURCE_FEED_CONTRACT):string|null{
 const snapshot=readonlySnapshots.get(feed),body=snapshot?.body;
 if(!body||snapshot?.contract!==contract||!feed.complete||!isSourceOnlyFeed(feed)||body!==JSON.stringify(feed))return null;
 return 'W/"hot-source-v1-'+createHash('sha256').update(scope).update('\0').update(contract).update('\0').update(body).digest('hex')+'"';
}
/** If-None-Match uses weak comparison for GET and permits quoted commas in a list. */
export function ifNoneMatchMatches(value:string|null,etag:string):boolean{
 if(value===null)return false;
 let rest=value.trim();if(rest==='*')return true;
 const tags:string[]=[];
 while(rest){
  if(rest.startsWith(',')){rest=rest.slice(1).trim();continue}
  const match=/^(?:W\/)?("[\x21\x23-\x7e\x80-\xff]*")(?=[\t ]*(?:,|$))/.exec(rest);
  if(!match)return false;
  tags.push(match[1]);rest=rest.slice(match[0].length).trim();
  if(rest)rest=rest.slice(1).trim();
 }
 return tags.includes(etag.replace(/^W\//,''));
}
