import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../lib/naver-hub.ts',import.meta.url),'utf8');
function adapter(env={NAVER_CLIENT_ID:'test-id',NAVER_CLIENT_SECRET:'test-secret'}){
 const counts={fetches:0,environmentReads:0},exports={};
 const guardedEnv=new Proxy(env,{get(){counts.environmentReads++;throw Error('Credentials must not be read')}});
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,URL,process:{env:guardedEnv},
  fetch(){counts.fetches++;throw Error('Network must not be used')},
  require(name){assert.equal(name,'server-only');return {}},
 });
 return {api:exports,counts};
}
for(const configured of [true,false])for(const kind of ['local','blog'])test(`${kind} adapter stays disabled with credentials ${configured?'present':'absent'}`,async()=>{
 const {api,counts}=adapter(configured?undefined:{});
 await assert.rejects(api.naverHubSearch(kind,' 서울 메뉴 '),error=>error instanceof api.NaverSearchUnavailable&&error.code==='disabled'&&error.message==='disabled');
 assert.deepEqual(counts,{fetches:0,environmentReads:0});
});
test('malformed and repeated direct adapter calls all fail closed without inspecting inputs',async()=>{
 const {api,counts}=adapter();
 const hostileQuery={trim(){throw Error('Input must not be inspected')}};
 for(const [kind,query] of [['image','서울'],['local',''],['blog','a'.repeat(1000)],[null,null],['local',hostileQuery]]){
  await assert.rejects(api.naverHubSearch(kind,query),error=>error.code==='disabled');
 }
 const results=await Promise.allSettled(Array.from({length:20},()=>api.naverHubSearch('blog','서울')));
 assert.ok(results.every(result=>result.status==='rejected'&&result.reason.code==='disabled'));
 assert.deepEqual(counts,{fetches:0,environmentReads:0});
});
test('ordinary source-link validation remains pure and keeps valid NAVER blog URLs',()=>{
 const {api,counts}=adapter();
 for(const url of ['https://blog.naver.com/kkj12486/224378768062','https://blog.naver.com/kkj12486/224423857846'])assert.equal(api.naverSourceLink(url),url);
 for(const url of ['javascript:alert(1)','https://user:pass@example.org/a','file:///private',null])assert.equal(api.naverSourceLink(url),'');
 assert.deepEqual(counts,{fetches:0,environmentReads:0});
});
