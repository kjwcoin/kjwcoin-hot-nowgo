import {publicDb} from '@/lib/supabase';
import {reply} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
import {SOURCE_FEED_CONTRACT_HEADER,resolveSourceFeedContract} from '@/lib/source-feed-contract';
import {ifNoneMatchMatches,readSourcedStoreFeed,sourcedStoreFeedEtag} from '@/lib/sourced-store-feed';
export async function GET(request:Request){
 const contract=resolveSourceFeedContract(request.headers.get(SOURCE_FEED_CONTRACT_HEADER));
 if(!contract)return reply(request,{error:'unsupported_source_feed_contract',complete:false},400);
 const headers={'Cache-Control':'no-store',[SOURCE_FEED_CONTRACT_HEADER]:contract,'Vary':'Host, Cookie, Authorization, '+SOURCE_FEED_CONTRACT_HEADER};
 if(variantForHost(request.headers.get('host'))!=='hot')return Response.json({stores:[],asOf:new Date().toISOString(),complete:true},{headers});
 try{
  const base=await readSourcedStoreFeed(request.signal,contract);
  const hidden=await publicDb().rpc('ng_hot_source_hidden_stores');if(hidden.error)throw hidden.error;
  const hiddenIds=new Set<string>(hidden.data||[]);const feed=hiddenIds.size?{...base,stores:base.stores.filter(store=>!hiddenIds.has(store.id))}:base;
  // Same-origin credentials still work for protected previews. Credentialed
  // responses never receive a validator or conditional reuse.
  const etag=request.headers.has('authorization')||request.headers.has('cookie')?null:
   sourcedStoreFeedEtag(feed,new URL(request.url).origin+'|'+(request.headers.get('host')||'').toLowerCase(),contract);
  if(!etag)return Response.json(feed,{headers});
  const conditionalHeaders={...headers,ETag:etag};
  if(ifNoneMatchMatches(request.headers.get('if-none-match'),etag))return new Response(null,{status:304,headers:conditionalHeaders});
  return Response.json(feed,{headers:conditionalHeaders});
 }catch{return Response.json({error:'자료 매장을 불러오지 못했어요.',complete:false},{status:503,headers})}
}
