import test from 'node:test';
import * as contracts from '../lib/source-feed-contract.ts';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as sourced from '../lib/sourced-store.ts';
import {readonlySourceStoreFeed} from '../lib/readonly-source-listings.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';
import {hookHarness,moduleAt} from './helpers/source-ui-components.mjs';

function feedModule({reader=readonlySourceStoreFeed,enabled=true}={}){
 return moduleAt('lib/sourced-store-feed.ts',{'node:crypto':{createHash},'./source-feed-contract.ts':contracts,'./sourced-store.ts':sourced,'./readonly-source-listings.ts':{readonlySourceStoreFeed:reader}},{process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:enabled?'true':'false'}}});
}
function routeModule(api,hidden=()=>({data:[],error:null})){
 return moduleAt('app/api/sourced-stores/route.ts',{'@/lib/supabase':{publicDb:()=>({rpc:async()=>hidden()})},'@/lib/source-feed-contract':contracts,'@/lib/server':{reply:(_request,data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}})},'@/lib/site-config':{variantForHost:host=>host.startsWith('sweet.')?'sweet':host.startsWith('rich.')?'rich':'hot'},'@/lib/sourced-store-feed':api},{Response,URL});
}
function request({host='hot.nowgo.space',etag,headers={}}={}){
 return new Request('https://'+host+'/api/sourced-stores',{headers:{host,...(etag?{'If-None-Match':etag}:{}),...headers}});
}
const fixture={stores:[sourceStore(1,{registrationState:'source-only'}),sourceStore(2,{registrationState:'source-only'})],complete:true,asOf:'2026-10-12T08:00:00Z'};
const version=n=>'W/"hot-source-v1-'+String(n).repeat(64)+'"';
function response(body=fixture,etag=version(1),status=200){return {status,ok:status>=200&&status<300,headers:new Headers({...etag?{etag}:{},[contracts.SOURCE_FEED_CONTRACT_HEADER]:contracts.CURRENT_SOURCE_FEED_CONTRACT}),json:async()=>body};}
const modified=(overrides)=>({...fixture,...overrides});
function client({initialFeed,previewFeed,origin='https://hot.nowgo.space'}={}){
 const harness=hookHarness(),calls=[],reads=[],intervals=[],timers=[],clearedTimers=[],listeners=new Map();
 const window={location:{origin},addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener(){}};
 const document={visibilityState:'visible',addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener(){}};
 const globals={AbortController,window,document,setTimeout:(callback,ms)=>{timers.push({callback,ms});return timers.length},clearTimeout:id=>clearedTimers.push(id),setInterval:(callback,ms)=>{intervals.push({callback,ms});return 1},clearInterval(){},fetch:(url,options)=>{calls.push({url,options});return new Promise((resolve,reject)=>reads.push({resolve,reject}))}};
 const {useSourcedStores}=moduleAt('hooks/use-sourced-stores.ts',{react:harness.react,'@/lib/source-feed-contract':contracts,'@/lib/sourced-store':sourced},globals);
 let variant='hot';
 return{calls,reads,intervals,timers,clearedTimers,listeners,window,document,harness,setVariant:value=>{variant=value},render:()=>harness.render(()=>useSourcedStores(variant,previewFeed,initialFeed)),reply:(index,value)=>reads[index].resolve(value),fail:index=>reads[index].reject(Error('unavailable'))};
}
async function seed(h,body=fixture,etag=version(1)){
 const pending=h.render().refresh();h.reply(h.reads.length-1,response(body,etag));await pending;return h.render();
}

test('manifest envelope is byte-stable and withdrawal review watermark never rewrites individual source dates',()=>{
 const first=readonlySourceStoreFeed(),second=readonlySourceStoreFeed();assert.equal(JSON.stringify(first),JSON.stringify(second));
 const dates=first.stores.flatMap(store=>[store.source.checkedAt,store.source.fieldProvenance?.registration?.checkedAt,store.source.fieldProvenance?.identity?.checkedAt,store.source.fieldProvenance?.coordinates.checkedAt,...store.menus.flatMap(menu=>[menu.sourceTaste?.checkedAt,menu.provenance?.checkedAt])]).filter(Boolean);
 assert.equal(first.asOf,new Date(Math.max(Date.parse('2026-10-13T13:31:00.000Z'),...dates.map(Date.parse))).toISOString());
 assert.notEqual(first.asOf,new Date().toISOString());assert.equal(first.stores[0].source.asOf,null);
});

test('first public 200 emits a scoped content validator; matching 304 has no body and keeps no-store',async()=>{
 const {GET}=routeModule(feedModule());
 const first=await GET(request());assert.equal(first.status,200);const etag=first.headers.get('etag');assert.match(etag,/^W\/"hot-source-v1-[a-f0-9]{64}"$/);
 const firstBody=await first.text();
 const unchanged=await GET(request({etag}));assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');assert.equal(unchanged.headers.get('etag'),etag);
 for(const result of [first,unchanged]){assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(result.headers.get('vary'),'Host, Cookie, Authorization, '+contracts.SOURCE_FEED_CONTRACT_HEADER)}
 const again=await GET(request());assert.equal(await again.text(),firstBody);assert.equal(again.headers.get('etag'),etag);
 const strongList=await GET(request({etag:'"older", '+etag.replace(/^W\//,'')}));assert.equal(strongList.status,304);
});

test('If-None-Match handles weak validators, lists, wildcard, opaque commas, and malformed fields',()=>{
 const {ifNoneMatchMatches:matches}=feedModule();const tag='"current"';
 for(const value of [tag,'W/'+tag,'"older", W/'+tag,'"has,a,comma", '+tag,'*',', '+tag+','])assert.equal(matches(value,tag),true,value);
 for(const value of [null,'','"other"','current','w/"current"','* , "current"','"current"junk','"current", garbage','"current" "other"'])assert.equal(matches(value,tag),false,value);
 assert.equal(matches('W/"has,a,comma"','"has,a,comma"'),true);
});

test('a release removal changes the validator and returns authoritative 200 including total removal',async()=>{
 let manifest=fixture;const {GET}=routeModule(feedModule({reader:()=>manifest}));const first=await GET(request());const old=first.headers.get('etag');
 for(const stores of [fixture.stores.slice(1),[]]){
  manifest=modified({stores});const fresh=await GET(request({etag:old}));assert.equal(fresh.status,200);assert.notEqual(fresh.headers.get('etag'),old);assert.equal((await fresh.json()).stores.length,stores.length);
 }
});

test('credentialed requests, owners, incomplete feeds, and unproven mutable objects never emit a validator or 304',async()=>{
 const api=feedModule({reader:()=>fixture}),route=routeModule(api);const first=await route.GET(request());const etag=first.headers.get('etag');
 for(const headers of [{Authorization:'Bearer synthetic'},{Cookie:'synthetic=1'}]){const result=await route.GET(request({etag,headers}));assert.equal(result.status,200);assert.equal(result.headers.get('etag'),null);assert.equal(result.headers.get('cache-control'),'no-store')}
 for(const reader of [()=>modified({complete:false}),()=>modified({stores:[sourceStore(3,{ownership:'verified',ownerClaimVerified:true,pinStatus:'owner-verified'})]})]){
  const {GET}=routeModule(feedModule({reader}));const result=await GET(request({etag:'*'}));assert.equal(result.status,200);assert.equal(result.headers.get('etag'),null);
 }
 const parsed=await api.readSourcedStoreFeed();assert.equal(api.sourcedStoreFeedEtag(structuredClone(parsed),'host'),null);
 parsed.stores=[];assert.equal(api.sourcedStoreFeedEtag(parsed,'host'),null);
 const unknown=routeModule({...api,readSourcedStoreFeed:async()=>structuredClone(fixture)});assert.equal((await unknown.GET(request({etag:'*'}))).status,200);
});

test('SWEET/RICH cannot match HOT, another HOT host gets another validator, disabled/errors cannot return 304',async()=>{
 const api=feedModule(),{GET}=routeModule(api);const first=await GET(request());const etag=first.headers.get('etag');
 for(const host of ['sweet.nowgo.space','rich.nowgo.space']){const result=await GET(request({host,etag}));assert.equal(result.status,200);assert.equal(result.headers.get('etag'),null);assert.equal((await result.json()).stores.length,0)}
 const other=await GET(request({host:'hot.localhost',etag}));assert.equal(other.status,200);assert.notEqual(other.headers.get('etag'),etag);
 for(const failed of [feedModule({enabled:false}),feedModule({reader:()=>{throw Error('private detail')}})]){const result=await routeModule(failed).GET(request({etag:'*'}));assert.equal(result.status,503);assert.equal(result.headers.get('etag'),null);assert.equal((await result.json()).complete,false)}
});

test('client first 200 then 304 reuses the exact validated snapshot and selected-store identity with same-origin credentials preserved',async()=>{
 const h=client();const first=await seed(h);assert.equal(h.calls[0].options.headers['If-None-Match'],undefined);
 const pending=first.refresh();assert.strictEqual(h.render().feed,first.feed);assert.equal(h.calls[1].options.headers['If-None-Match'],version(1));
 h.reply(1,{...response(null,version(1),304),json:()=>{throw Error('304 has no JSON body')}});await pending;const ready=h.render();assert.equal(ready.status,'ready');assert.strictEqual(ready.feed,first.feed);assert.strictEqual(ready.feed.stores[0],first.feed.stores[0]);
 for(const {options} of h.calls){assert.equal(options.cache,'no-store');assert.equal(options.credentials,'same-origin');assert.equal(options.headers[contracts.SOURCE_FEED_CONTRACT_HEADER],contracts.CURRENT_SOURCE_FEED_CONTRACT)}
});

test('a version-change 200 replaces facts and removals before the next conditional request',async()=>{
 const h=client();await seed(h);const pending=h.render().refresh();h.reply(1,response(modified({stores:[]}),version(2)));await pending;assert.equal(h.render().feed.stores.length,0);
 const next=h.render().refresh();assert.equal(h.calls[2].options.headers['If-None-Match'],version(2));h.reply(2,response(null,version(2),304));await next;assert.equal(h.render().feed.stores.length,0);
});

test('cold and SSR-seeded 304 clear untrusted facts and recover with exactly one unconditional 200 refetch',async()=>{
 for(const initialFeed of [undefined,fixture]){
  const h=client({initialFeed});const pending=h.render().refresh();h.reply(0,response(null,version(1),304));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls.length,2);assert.equal(h.render().status,'loading');assert.equal(h.render().feed,null);assert.equal(h.calls[1].options.headers['If-None-Match'],undefined);
  assert.strictEqual(h.calls[0].options.signal,h.calls[1].options.signal);assert.equal(h.calls[1].options.headers[contracts.SOURCE_FEED_CONTRACT_HEADER],contracts.CURRENT_SOURCE_FEED_CONTRACT);assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,10000);
  h.reply(1,response(fixture,version(2)));await pending;assert.equal(h.render().status,'ready');assert.equal(h.render().feed.stores.length,2);assert.equal(h.calls.length,2);assert.equal(h.clearedTimers.length,1);
  const next=h.render().refresh();assert.equal(h.calls[2].options.headers['If-None-Match'],version(2));h.reply(2,response(null,version(2),304));await next;
 }
});

test('a restored visible tab without an in-memory validator recovers a cold 304 through 200',async()=>{
 const h=client({initialFeed:fixture});h.render();h.harness.flushEffects();h.document.visibilityState='visible';h.listeners.get('visibilitychange')();
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.headers['If-None-Match'],undefined);h.reply(0,response(null,version(1),304));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls.length,2);assert.equal(h.render().feed,null);h.reply(1,response());await new Promise(resolve=>setImmediate(resolve));assert.equal(h.render().status,'ready');assert.equal(h.render().feed.stores.length,2);
});

test('a mismatched 304 drops its old snapshot before one unconditional 200 recovery',async()=>{
 const h=client();await seed(h);const pending=h.render().refresh();h.reply(1,response(null,version(2),304));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.render().feed,null);assert.equal(h.calls.length,3);assert.equal(h.calls[2].options.headers['If-None-Match'],undefined);
 h.reply(2,response(modified({stores:[]}),version(2)));await pending;assert.equal(h.render().status,'ready');assert.equal(h.render().feed.stores.length,0);
});

test('the unconditional fallback never loops: repeated 304, HTTP, parse, and network errors fail closed',async()=>{
 for(const failure of ['304','http','parse','network']){
  const h=client({initialFeed:fixture});const pending=h.render().refresh();h.reply(0,response(null,version(1),304));await new Promise(resolve=>setImmediate(resolve));
  if(failure==='network')h.fail(1);else h.reply(1,failure==='304'?response(null,version(1),304):failure==='http'?response(null,null,503):response({invalid:true}));
  await pending;assert.equal(h.calls.length,2);assert.equal(h.render().status,'error');assert.equal(h.render().feed,null);
 }
});

test('a newer refresh aborts both legs of an old fallback and late fallback results cannot replace it',async()=>{
 for(const late of ['200','304','error']){
  const h=client();const stale=h.render().refresh();h.reply(0,response(null,version(1),304));await new Promise(resolve=>setImmediate(resolve));assert.equal(h.calls.length,2);
  const latest=h.render().refresh();assert.equal(h.calls[0].options.signal.aborted,true);assert.strictEqual(h.calls[0].options.signal,h.calls[1].options.signal);assert.equal(h.calls[2].options.signal.aborted,false);
  h.reply(2,response(modified({stores:[]}),version(2)));await latest;if(late==='error')h.fail(1);else h.reply(1,response(fixture,version(1),Number(late)));await stale;
  assert.equal(h.render().status,'ready');assert.equal(h.render().feed.stores.length,0);assert.equal(h.calls.length,3);
 }
});

test('a fallback keeps the initial deadline and does not start a fresh timeout',async()=>{
 const h=client();const pending=h.render().refresh();h.reply(0,response(null,version(1),304));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,10000);h.timers[0].callback();assert.equal(h.calls[0].options.signal.aborted,true);assert.equal(h.calls[1].options.signal.aborted,true);h.fail(1);await pending;assert.equal(h.render().feed,null);assert.equal(h.calls.length,2);
});

test('a version-change 200 preserves selected IDs, replaces facts, and does not duplicate the same store',async()=>{
 const h=client();const first=await seed(h);const selectedId=first.feed.stores[0].id;
 const updated={...fixture.stores[0],name:'갱신한 자료 식당'};const pending=first.refresh();h.reply(1,response(modified({stores:[updated,updated,fixture.stores[1]]}),version(2)));await pending;
 const next=h.render();assert.equal(next.feed.stores.length,2);assert.equal(new Set(next.feed.stores.map(store=>store.id)).size,2);assert.equal(next.feed.stores.find(store=>store.id===selectedId).name,updated.name);
 assert.deepEqual(next.feed.stores.map(store=>store.id),first.feed.stores.map(store=>store.id));
 const unchanged=next.refresh();h.reply(2,response(null,version(2),304));await unchanged;assert.strictEqual(h.render().feed,next.feed);assert.strictEqual(h.render().feed.stores[0],next.feed.stores[0]);
});

test('network, HTTP and parse errors clear the snapshot as well as the old panel facts',async()=>{
 for(const failure of ['network','http','parse']){const h=client();await seed(h);const pending=h.render().refresh();if(failure==='network')h.fail(1);else h.reply(1,failure==='http'?response(null,null,503):response({invalid:true}));await pending;assert.equal(h.render().status,'error');assert.equal(h.render().feed,null);const retry=h.render().refresh();assert.equal(h.calls[2].options.headers['If-None-Match'],undefined);h.reply(2,response());await retry}
});

test('a missing/malformed validator, incomplete data, or an owner response prevents later 304 reuse',async()=>{
 for(const [body,etag] of [[fixture,null],[fixture,'"unrelated"'],[modified({complete:false}),version(1)],[modified({stores:[sourceStore(3,{ownership:'verified',ownerClaimVerified:true,pinStatus:'owner-verified'})]}),version(1)]]){
  const h=client();await seed(h);await seed(h,body,etag);const pending=h.render().refresh();assert.equal(h.calls[2].options.headers['If-None-Match'],undefined);h.reply(2,response(null,version(1),304));await new Promise(resolve=>setImmediate(resolve));assert.equal(h.render().feed,null);assert.equal(h.calls[3].options.headers['If-None-Match'],undefined);h.reply(3,response(fixture,version(2)));await pending;assert.equal(h.render().status,'ready');
 }
});

test('late 200, 304 or failures from an aborted request cannot replace a newer feed or its validator',async()=>{
 for(const late of ['200','304','error']){const h=client();await seed(h);const stale=h.render().refresh();const latest=h.render().refresh();assert.equal(h.calls[1].options.signal.aborted,true);h.reply(2,response(modified({stores:[]}),version(2)));await latest;if(late==='error')h.fail(1);else h.reply(1,response(fixture,version(1),Number(late)));await stale;assert.equal(h.render().status,'ready');assert.equal(h.render().feed.stores.length,0);const next=h.render().refresh();assert.equal(h.calls[3].options.headers['If-None-Match'],version(2));h.reply(3,response(null,version(2),304));await next}
});

test('a stale JSON parse finishing after a new response cannot overwrite the new snapshot',async()=>{
 const h=client();await seed(h);let resolveBody;const stale=h.render().refresh();h.reply(1,{...response(),json:()=>new Promise(resolve=>{resolveBody=resolve})});await new Promise(resolve=>setImmediate(resolve));const latest=h.render().refresh();h.reply(2,response(modified({stores:[]}),version(2)));await latest;resolveBody(fixture);await stale;assert.equal(h.render().feed.stores.length,0);
});

test('client origin and planet changes hide prior facts immediately and never send the old validator',async()=>{
 for(const variant of ['sweet','rich']){const h=client();await seed(h);h.setVariant(variant);assert.equal(h.render().feed,null);await h.render().refresh();assert.equal(h.render().feed.stores.length,0);assert.equal(h.calls.length,1);h.setVariant('hot');const pending=h.render().refresh();assert.equal(h.calls[1].options.headers['If-None-Match'],undefined);h.reply(1,response());await pending}
 const h=client();await seed(h);h.window.location.origin='https://hot.localhost';assert.equal(h.render().feed,null);const pending=h.render().refresh();assert.equal(h.calls[1].options.headers['If-None-Match'],undefined);assert.equal(h.render().feed,null);h.reply(1,response());await pending;
});

test('the visible poll remains 30 seconds with focus, visibility and catalog/activity invalidation',async()=>{
 const h=client();h.render();h.harness.flushEffects();assert.equal(h.intervals.length,1);assert.equal(h.intervals[0].ms,30000);
 h.document.visibilityState='hidden';h.intervals[0].callback();assert.equal(h.calls.length,0);
 h.document.visibilityState='visible';h.intervals[0].callback();assert.equal(h.calls.length,1);h.reply(0,response());await new Promise(resolve=>setImmediate(resolve));
 for(const event of ['focus','visibilitychange','nowgo:catalog-refresh','nowgo-activity-change'])assert.equal(typeof h.listeners.get(event),'function');
});

// Production304 intermediaries omit the extension contract header.
test('matching304 without extension header retains exact validated scoped snapshot without refetch',async()=>{
 const h=client();const first=await seed(h);const pending=first.refresh();
 h.reply(1,{...response(null,version(1),304),headers:new Headers({etag:version(1)})});await pending;
 assert.equal(h.calls.length,2);assert.equal(h.render().status,'ready');assert.strictEqual(h.render().feed,first.feed);
});
test('explicit conflicting304 contract and missing-header mismatched validators cannot retain facts',async()=>{
 for(const headers of [new Headers({etag:version(1),[contracts.SOURCE_FEED_CONTRACT_HEADER]:'hot-source-1099-v1'}),new Headers({etag:version(2)}),new Headers()]){
  const h=client();await seed(h);const pending=h.render().refresh();h.reply(1,{...response(null,version(1),304),headers});await new Promise(setImmediate);
  assert.equal(h.render().feed,null);assert.equal(h.calls.length,3);h.reply(2,response(modified({stores:[]}),version(2)));await pending;assert.equal(h.render().feed.stores.length,0);
 }
});
test('missing-header304 with no validated snapshot still clears and fetches authoritative200',async()=>{
 const h=client({initialFeed:fixture});const pending=h.render().refresh();h.reply(0,{...response(null,version(1),304),headers:new Headers({etag:version(1)})});await new Promise(setImmediate);
 assert.equal(h.render().feed,null);assert.equal(h.calls.length,2);h.reply(1,response());await pending;assert.equal(h.render().feed.stores.length,2);
});

test('hidden-store withdrawal and hidden RPC failure override a matching client validator',async()=>{
 let result={data:[],error:null};const api=feedModule({reader:()=>fixture}),{GET}=routeModule(api,()=>result);
 const initial=await GET(request());const etag=initial.headers.get('etag');
 result={data:[fixture.stores[0].id],error:null};const withdrawn=await GET(request({etag}));
 assert.equal(withdrawn.status,200);assert.equal(withdrawn.headers.get('etag'),null);assert.deepEqual((await withdrawn.json()).stores.map(x=>x.id),[fixture.stores[1].id]);
 result={data:null,error:Error('unavailable')};const failed=await GET(request({etag}));assert.equal(failed.status,503);assert.equal((await failed.json()).complete,false);
});
