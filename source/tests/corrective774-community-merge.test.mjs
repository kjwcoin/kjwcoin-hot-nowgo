import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import records from '../lib/readonly-source-records.ts';import * as readonly from '../lib/readonly-source-listings.ts';import * as contracts from '../lib/source-feed-contract.ts';import * as sourced from '../lib/sourced-store.ts';import {moduleAt} from './helpers/source-ui-components.mjs';
const source=()=>moduleAt('lib/sourced-store-feed.ts',{'node:crypto':{createHash},'./source-feed-contract.ts':contracts,'./sourced-store.ts':sourced,'./readonly-source-listings.ts':readonly},{process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:'true'}}});
const request=(contract=contracts.CURRENT_SOURCE_FEED_CONTRACT,extra={})=>new Request('https://hot.nowgo.space/api/sourced-stores',{headers:{host:'hot.nowgo.space',[contracts.SOURCE_FEED_CONTRACT_HEADER]:contract,...extra}}),reply=(_request,data,status=200)=>Response.json(data,{status});
function route(result){return moduleAt('app/api/sourced-stores/route.ts',{'@/lib/supabase':{publicDb:()=>({rpc:async name=>{assert.equal(name,'ng_hot_source_hidden_stores');return result}})},'@/lib/server':{reply},'@/lib/site-config':{variantForHost:()=> 'hot'},'@/lib/source-feed-contract':contracts,'@/lib/sourced-store-feed':source()},{URL,Response}).GET}
test('a410 visibility gate is retained over restored774; errors remain fail-closed',async()=>{
 const GET=route({data:[],error:null}),res=await GET(request());assert.equal(res.status,200);assert.equal((await res.json()).stores.length,774);assert.ok(res.headers.get('etag'));assert.equal((await GET(request(undefined,{'If-None-Match':res.headers.get('etag')}))).status,304);
 const hidden=records.at(-1).id,filtered=await route({data:[hidden],error:null})(request()),body=await filtered.json();assert.equal(body.stores.length,773);assert(!body.stores.some(s=>s.id===hidden));assert.equal(filtered.headers.get('etag'),null);
 const failed=await route({data:null,error:{message:'visibility_unavailable'}})(request());assert.equal(failed.status,503);assert.equal((await failed.json()).complete,false);
});
test('seven restored contracts remain menu-bearing behind current API',async()=>{
 const GET=route({data:[],error:null});for(const [c,n] of Object.entries({'hot-source-130-v1':99,'hot-source-588-v1':414,'hot-source-591-v1':417,'hot-source-591-v2':417,'hot-source-946-v1':772,'hot-source-948-v1':774,'hot-source-774-v1':774})){const r=await GET(request(c));assert.equal(r.status,200);const f=await r.json();assert.equal(f.stores.length,n);assert(f.stores.every(s=>s.menus.length));}
});
test('merged detail preserves community controls and truthful KOGL1 attribution',()=>{
 const text=readFileSync(new URL('../components/sourced-store-detail.tsx',import.meta.url),'utf8');assert.match(text,/import SourceCommunity/);assert.match(text,/<SourceCommunity key=/);assert.match(text,/:sourceOnly\?null:/);assert.doesNotMatch(text,/className="source-public-taste"/);assert.match(text,/menu\.provenance\.explicitOpenLicense/);assert.match(text,/menu\.provenance\.attribution/);
 const page=readFileSync(new URL('../app/p/[slug]/page.tsx',import.meta.url),'utf8');assert.match(page,/ng_hot_source_hidden_stores/);assert.match(page,/store_visibility_unavailable/);
});
test('community route preserves backend-not-found, excluded-store and login gates',async()=>{
 const rpcCalls=[];const api=moduleAt('app/api/source-community/route.ts',{'sharp':{default:()=>{throw Error('photo processing must not run in gate checks')}},'@/lib/readonly-source-records':{default:records},'@/lib/source-community':{sourceTasteInput:()=>{throw Error('unused')}},'@/lib/supabase':{verifiedUser:async()=>null,publicDb:()=>({rpc:async(name,args)=>{rpcCalls.push({name,args});return{error:{message:'source_store_not_found'},data:null}}})},'@/lib/server':{reply,validOrigin:()=>true,failure:(_r,e)=>Response.json({error:e.message},{status:503})},'@/lib/site-config':{variantForHost:()=> 'hot'}},{URL,Response});
 const id=records.at(-1).id,r=await api.GET(new Request('https://hot.nowgo.space/api/source-community?storeId='+id,{headers:{host:'hot.nowgo.space'}}));assert.equal(r.status,404);assert.equal(rpcCalls.length,2);assert(rpcCalls.every(x=>x.args.p_store===id));
 const before=rpcCalls.length;assert.equal((await api.GET(new Request('https://hot.nowgo.space/api/source-community?storeId=03cfc5d3-05f3-5a2c-a60d-747181749959',{headers:{host:'hot.nowgo.space'}}))).status,400);assert.equal(rpcCalls.length,before);
 assert.equal((await api.POST(new Request('https://hot.nowgo.space/api/source-community',{method:'POST',headers:{origin:'https://hot.nowgo.space',host:'hot.nowgo.space'},body:'{}'}))).status,401);
});

 test('newest character progress and expanded mobile-list interactions are preserved',()=>{
 const detail=readFileSync(new URL('../components/sourced-store-detail.tsx',import.meta.url),'utf8');assert.doesNotMatch(detail,/<SourceAccountCharacter/);assert.doesNotMatch(detail,/<SourceAccountCharacter returnTo=\{path\} readOnly/);
 const explorer=readFileSync(new URL('../components/map-explorer.tsx',import.meta.url),'utf8');assert.match(explorer,/if\(expanded&&window\.matchMedia/);assert.match(explorer,/moveSheet\(0\);if\(searchRow\.current\)setMobileDetailTop/);assert.match(explorer,/data-source-store-id/);
 });
