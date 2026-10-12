import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../lib/naver-hub.ts',import.meta.url),'utf8');
function adapter({env={NAVER_CLIENT_ID:'test-id',NAVER_CLIENT_SECRET:'test-secret'},fetcher=async()=>({ok:true,json:async()=>({items:[],total:0})})}={}){
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){assert.equal(name,'server-only');return {}},process:{env},fetch:fetcher,URL,AbortSignal});return exports;
}
for(const kind of ['local','blog'])test(`${kind} uses API HUB with separate server keys, bounded requests, no cache/redirect`,async()=>{
 let call;const api=adapter({fetcher:async(url,options)=>{call={url,options};return {ok:true,json:async()=>({items:[{title:'<b>실제</b> 검색',description:'원문 설명',link:'https://example.org/original',mapx:'127',mapy:'37'}],total:12})}}});
 const result=await api.naverHubSearch(kind,' 서울 메뉴 ');
 assert.equal(call.url.origin,'https://naverapihub.apigw.ntruss.com');assert.equal(call.url.pathname,'/search/v1/'+kind);
 assert.equal(call.url.searchParams.get('display'),kind==='local'?'5':'10');assert.equal(call.url.searchParams.get('start'),'1');assert.equal(call.url.searchParams.get('format'),'json');assert.equal(call.url.searchParams.get('query'),'서울 메뉴');
 assert.equal(call.options.headers['X-NCP-APIGW-API-KEY-ID'],'test-id');assert.equal(call.options.headers['X-NCP-APIGW-API-KEY'],'test-secret');assert.equal(call.options.cache,'no-store');assert.equal(call.options.redirect,'error');
 assert.equal(result.items[0].title,'<b>실제</b> 검색');assert.equal(result.items[0].description,'원문 설명');assert.equal(result.provider,'NAVER API HUB');
 assert.equal(JSON.stringify(result).includes('test-secret'),false);assert.equal('heat' in result.items[0],false);assert.equal('price' in result.items[0],false);assert.equal('verified' in result.items[0],false);
});
test('unconfigured search is explicit and never sends a network request',async()=>{
 const api=adapter({env:{},fetcher:()=>{throw Error('must not fetch')}});
 await assert.rejects(api.naverHubSearch('local','서울 메뉴'),error=>error.code==='not_configured');
});
test('invalid kind/query is rejected before any upstream work',async()=>{
 const api=adapter({fetcher:()=>{throw Error('must not fetch')}});
 for(const [kind,q] of [['local','a'],['blog','a'.repeat(71)],['image','서울 메뉴']])await assert.rejects(api.naverHubSearch(kind,q));
});
test('upstream error bodies and malformed responses never leak into the result',async()=>{
 for(const fetcher of [async()=>({ok:false,status:403,json:async()=>({secret:'sensitive'})}),async()=>({ok:true,json:async()=>({items:'wrong'})}),async()=>{throw Error('sensitive test-secret')}]){
  await assert.rejects(adapter({fetcher}).naverHubSearch('local','서울 메뉴'),error=>error.message==='upstream_unavailable');
 }
});
test('unsafe source URLs cannot become clickable links; provider wording stays text',async()=>{
 const api=adapter({fetcher:async()=>({ok:true,json:async()=>({items:[{title:'<script>alert(1)</script>',link:'javascript:alert(1)',description:'설명'},{title:'URL',link:'https://user:pass@example.org/a'}],total:-1})})});
 const result=await api.naverHubSearch('blog','서울 메뉴');assert.equal(result.items[0].link,'');assert.equal(result.items[1].link,'');assert.equal(result.items[0].title,'<script>alert(1)</script>');assert.equal(result.total,null);
});
test('upstream item count is bounded and order is retained',async()=>{
 const api=adapter({fetcher:async()=>({ok:true,json:async()=>({items:Array.from({length:200},(_,i)=>({title:String(i)})),total:200})})});
 assert.deepEqual(Array.from((await api.naverHubSearch('local','서울 메뉴')).items,item=>item.title),['0','1','2','3','4']);
 assert.equal((await api.naverHubSearch('blog','서울 메뉴')).items.length,10);
});

test('missing totals remain unknown rather than claiming zero results',async()=>{const api=adapter({fetcher:async()=>({ok:true,json:async()=>({items:[{title:'실제 결과'}]})})});assert.equal((await api.naverHubSearch('local','서울 메뉴')).total,null)});
