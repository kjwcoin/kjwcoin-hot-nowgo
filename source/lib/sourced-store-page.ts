import {cache} from 'react';
import {readSourcedStoreFeed} from './sourced-store-feed';
import type {PublicSourcedStore,PublicSourcedStoreFeed} from './sourced-store';

export function validSourcedStoreSlug(slug:string):boolean {
 return slug.length<=80&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
/** Absence is authoritative only when the public feed is complete. */
export function sourcedStoreInFeed(slug:string,feed:PublicSourcedStoreFeed):PublicSourcedStore|null {
 if(!validSourcedStoreSlug(slug))return null;
 const store=feed.stores.find(item=>item.slug===slug);
 if(store)return store;
 if(!feed.complete)throw Error('source_feed_incomplete');
 return null;
}
export const readSourcedStoreBySlug=cache(async(slug:string):Promise<PublicSourcedStore|null>=>{
 if(!validSourcedStoreSlug(slug))return null;
 return sourcedStoreInFeed(slug,await readSourcedStoreFeed());
});
