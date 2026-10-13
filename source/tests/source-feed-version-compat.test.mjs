import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as contracts from '../lib/source-feed-contract.ts';
import * as sourced from '../lib/sourced-store.ts';
import * as readonly from '../lib/readonly-source-listings.ts';
import {hookHarness,moduleAt} from './helpers/source-ui-components.mjs';
const {CURRENT_SOURCE_FEED_CONTRACT:current,LEGACY_SOURCE_FEED_CONTRACT:legacy,SOURCE_FEED_CONTRACT_HEADER:header}=contracts;

// Locked to the 130 public DTOs from the reviewed 7dd55042 snapshot. Actual
// old compiled-bundle execution is separate release QA, not a checkout dependency.
const LEGACY_FACTS_SHA256='46c15c3117147264d70a35a35ce8a1f0f9abe62510150f4fc402b78bdbd222ab';
function api({reader=readonly.readonlySourceStoreFeed}={}){
 return moduleAt('lib/sourced-store-feed.ts',{'node:crypto':{createHash},'./source-feed-contract.ts':contracts,'./sourced-store.ts':sourced,'./readonly-source-listings.ts':{readonlySourceStoreFeed:reader}},{process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:'true'}}});
}
function route(source=api()){
 return moduleAt('app/api/sourced-stores/route.ts',{'@/lib/source-feed-contract':contracts,'@/lib/server':{reply:(_req,data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}})},'@/lib/site-config':{variantForHost:host=>host.startsWith('sweet.')?'sweet':host.startsWith('rich.')?'rich':'hot'},'@/lib/sourced-store-feed':source},{URL,Response}).GET;
}
function req(contract,extra={}){return new Request('https://hot.nowgo.space/api/sourced-stores',{headers:{host:'hot.nowgo.space',...(contract!==undefined?{[header]:contract}:{}),...extra}})}
function client(fetch){
 const harness=hookHarness(),calls=[];
 const globals={AbortController,setTimeout:()=>1,clearTimeout(){},window:{location:{origin:'https://hot.nowgo.space'}},fetch:(url,options)=>{calls.push(options);return fetch(url,options)}};
 const {useSourcedStores}=moduleAt('hooks/use-sourced-stores.ts',{react:harness.react,'@/lib/sourced-store':sourced,'@/lib/source-feed-contract':contracts},globals);
 return{calls,render:()=>harness.render(()=>useSourcedStores('hot'))};
}

test('unversioned HTTP serves the exact reviewed 130 public DTO hash with stable identities',async()=>{
 const GET=route();const response=await GET(req());const feed=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get(header),legacy);assert.equal(feed.stores.length,130);assert.equal(feed.complete,true);
 assert.equal(createHash('sha256').update(JSON.stringify(feed.stores)).digest('hex'),LEGACY_FACTS_SHA256);assert.deepEqual(sourced.parseSourcedStoreFeed(feed),feed);
 const explicit=await GET(req(legacy));assert.deepEqual(await explicit.json(),feed);
 const full=readonly.readonlySourceStoreFeed();assert.equal(full.stores.length,588);
 assert.deepEqual(feed.stores,full.stores.slice(0,130));
});

test('the new hook explicitly requests and accepts all 588; internal reader and SSR/default manifest remain current',async()=>{
 const source=api(),GET=route(source);assert.equal((await source.readSourcedStoreFeed()).stores.length,588);assert.equal(readonly.readonlySourceStoreFeed().stores.length,588);
 const h=client((_url,options)=>GET(req(options.headers[header],options.headers)));await h.render().refresh();
 assert.equal(h.render().status,'ready');assert.equal(h.render().feed.stores.length,588);assert.equal(h.render().feed.complete,true);assert.equal(h.calls[0].headers[header],current);assert.equal(h.calls[0].credentials,'same-origin');
 const identity=h.render().feed;await h.render().refresh();assert.strictEqual(h.render().feed,identity);assert.ok(h.calls[1].headers['If-None-Match']);
});

test('unknown, empty, count and list contracts return one clear 400 without selecting a fallback manifest',async()=>{
 let reads=0;const GET=route(api({reader:()=>{reads++;return readonly.readonlySourceStoreFeed()}}));
 for(const unknown of ['','588','current','hot-source-999-v1',legacy+', '+current]){const response=await GET(req(unknown,{'If-None-Match':'*'}));assert.equal(response.status,400);assert.equal(response.headers.get('etag'),null);const body=await response.json();assert.equal(body.error,'unsupported_source_feed_contract');assert.equal(body.complete,false);assert.equal(body.stores,undefined)}
 assert.equal(reads,0);assert.throws(()=>readonly.readonlySourceStoreFeed('hot-source-999-v1'),/unsupported_source_feed_contract/);
});

test('version-specific ETags and response contracts never cross even when a test reader returns identical facts',async()=>{
 for(const source of [api(),api({reader:()=>readonly.readonlySourceStoreFeed(legacy)})]){
  const GET=route(source);const old=await GET(req());const fresh=await GET(req(current));const oldTag=old.headers.get('etag'),newTag=fresh.headers.get('etag');assert.notEqual(oldTag,newTag);
  const wrongNew=await GET(req(current,{'If-None-Match':oldTag}));assert.equal(wrongNew.status,200);assert.equal(wrongNew.headers.get(header),current);
  const wrongOld=await GET(req(legacy,{'If-None-Match':newTag}));assert.equal(wrongOld.status,200);assert.equal(wrongOld.headers.get(header),legacy);
  const valid=await GET(req(current,{'If-None-Match':newTag}));assert.equal(valid.status,304);assert.equal(valid.headers.get(header),current);
 }
});

test('reviewed removal changes the content validator inside its own contract and cannot invalidate another contract',async()=>{
 let manifest=readonly.readonlySourceStoreFeed(legacy);const source=api({reader:()=>manifest}),GET=route(source);const before=await GET(req(legacy));const oldTag=before.headers.get('etag');
 manifest={...manifest,stores:manifest.stores.slice(1)};const after=await GET(req(legacy,{'If-None-Match':oldTag}));assert.equal(after.status,200);assert.notEqual(after.headers.get('etag'),oldTag);assert.equal(after.headers.get(header),legacy);assert.equal(sourced.parseSourcedStoreFeed(await after.json()).stores.length,129);
 const known=await source.readSourcedStoreFeed(undefined,legacy);assert.equal(source.sourcedStoreFeedEtag(known,'same-origin',current),null);
});

test('all contracts preserve same IDs and menu facts, and source write guards reserve all 588 identities',()=>{
 const old=readonly.readonlySourceStoreFeed(legacy),full=readonly.readonlySourceStoreFeed(current),byId=new Map(full.stores.map(store=>[store.id,store]));
 for(const store of old.stores){const next=byId.get(store.id);assert.deepEqual(next,store);assert.deepEqual(next.menus.map(menu=>menu.id),store.menus.map(menu=>menu.id))}
 for(const store of full.stores){assert.equal(readonly.isReadonlySourceStoreId(store.id),true);assert.equal(readonly.isReadonlySourceReportBinding({nowgo_store_id:store.id}),true);for(const menu of store.menus)assert.equal(readonly.isReadonlySourceReportBinding({menu_id:menu.id}),true)}
 const tampered=structuredClone(full);tampered.stores[130].name+=' changed';assert.throws(()=>sourced.parseSourcedStoreFeed(tampered),/invalid_source_store/);
});

test('unsupported-contract 400 clears both cold and previously validated facts with no retry or reload loop',async()=>{
 for(const seeded of [false,true]){
  let reject=false;const GET=route();const h=client((_url,options)=>GET(req(reject?'unsupported-review-contract':options.headers[header],reject?{}:options.headers)));
  if(seeded){await h.render().refresh();assert.equal(h.render().feed.stores.length,588)}
  reject=true;const before=h.calls.length;await h.render().refresh();assert.equal(h.calls.length,before+1);assert.equal(h.render().status,'error');assert.equal(h.render().feed,null);
  reject=false;await h.render().refresh();assert.equal(h.calls.at(-1).headers['If-None-Match'],undefined);assert.equal(h.render().feed.stores.length,588);
 }
});

test('wrong or missing response contract on 200 fails closed without trusting a valid-looking legacy body',async()=>{
 for(const responseContract of [null,legacy]){
  let wrong=false;const GET=route();const h=client(async(_url,options)=>{if(!wrong)return GET(req(options.headers[header],options.headers));return Response.json(readonly.readonlySourceStoreFeed(legacy),{headers:responseContract?{[header]:responseContract}:{}})});
  await h.render().refresh();wrong=true;await h.render().refresh();assert.equal(h.render().status,'error');assert.equal(h.render().feed,null);assert.equal(h.calls.length,2);
 }
});

test('wrong-contract 304 retries once with the current contract and no validator, then accepts only current 200',async()=>{
 const GET=route();let wrong=false;const h=client((_url,options)=>wrong&&options.headers['If-None-Match']?Promise.resolve(new Response(null,{status:304,headers:{etag:options.headers['If-None-Match'],[header]:legacy}})):GET(req(options.headers[header],options.headers)));
 await h.render().refresh();wrong=true;await h.render().refresh();assert.equal(h.calls.length,3);assert.equal(h.calls[2].headers[header],current);assert.equal(h.calls[2].headers['If-None-Match'],undefined);assert.equal(h.render().status,'ready');assert.equal(h.render().feed.stores.length,588);
});

test('credentials still deny validators independently of either supported contract',async()=>{
 const GET=route();for(const contract of [legacy,current])for(const credentials of [{Cookie:'preview=synthetic'},{Authorization:'Bearer synthetic'}]){
  const response=await GET(req(contract,{'If-None-Match':'*',...credentials}));assert.equal(response.status,200);assert.equal(response.headers.get('etag'),null);assert.equal(response.headers.get(header),contract);assert.equal(response.headers.get('cache-control'),'no-store');
 }
});
