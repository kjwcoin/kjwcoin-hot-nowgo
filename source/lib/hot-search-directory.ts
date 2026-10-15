import {cache} from 'react';
import {publicDb} from './supabase';
import {readSourcedStoreFeed} from './sourced-store-feed';
/** Match the public map and detail routes: hidden and NOINDEX records stay out. */
export const readHotSearchStores=cache(async()=>{
 if(process.env.NOWGO_UNCLAIMED_STORES_ENABLED!=='true')return [];
 const feed=await readSourcedStoreFeed();
 if(!feed.complete)throw Error('discovery_source_feed_incomplete');
 const {data,error}=await publicDb().rpc('ng_hot_source_hidden_stores').abortSignal(AbortSignal.timeout(8000));
 if(error)throw Error('store_visibility_unavailable');
 const hidden=new Set<string>(data||[]);
 return feed.stores.filter(store=>store.indexable===true&&!hidden.has(store.id))
  .sort((a,b)=>a.address.localeCompare(b.address,'ko')||a.name.localeCompare(b.name,'ko')||a.id.localeCompare(b.id));
});
