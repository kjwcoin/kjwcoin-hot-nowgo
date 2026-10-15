import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import {reply} from '../lib/server.ts';

const source=fs.readFileSync(new URL('../app/api/naver-search/route.ts',import.meta.url),'utf8');
function route(){
 const exports={},imports=[],counts={fetches:0,environmentReads:0};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,URL,
  fetch(){counts.fetches++;throw Error('Network must not be used')},
  process:{env:new Proxy({NAVER_CLIENT_ID:'test-id',NAVER_CLIENT_SECRET:'test-secret'},{get(){counts.environmentReads++;throw Error('Environment must not be read')}})},
  require(name){imports.push(name);assert.equal(name,'@/lib/server','Auth, rate limits, and provider adapters must not be imported');return {reply}},
 });
 return {GET:exports.GET,counts,imports};
}
async function assertDisabled(response){
 assert.equal(response.status,410);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(await response.json(),{error:'네이버 검색 기능은 중단되었습니다.',code:'naver_search_disabled'});
}
for(const authenticated of [true,false])for(const kind of ['local','blog'])test(`${kind} direct or stale-client request returns 410 for ${authenticated?'authenticated':'anonymous'} callers`,async()=>{
 const api=route();
 const req=new Request('https://hot.nowgo.space/api/naver-search?'+new URLSearchParams({kind,q:'서울 메뉴'}),{headers:authenticated?{authorization:'Bearer test-token'}:{}});
 await assertDisabled(await api.GET(req));
 assert.deepEqual(api.counts,{fetches:0,environmentReads:0});
 assert.deepEqual(api.imports,['@/lib/server']);
});
test('invalid and missing query parameters still return the same disabled response',async()=>{
 const api=route();
 for(const query of ['','kind=image&q=서울','kind=local&q=a','kind=blog&q='+'a'.repeat(1000),'kind=local&q=%E0%A4%A']){
  await assertDisabled(await api.GET(new Request('https://hot.nowgo.space/api/naver-search?'+query)));
 }
 assert.deepEqual(api.counts,{fetches:0,environmentReads:0});
});
test('repeated and concurrent stale-client submissions cannot reach any service',async()=>{
 const api=route();
 await Promise.all(Array.from({length:30},async()=>assertDisabled(await api.GET(new Request('https://hot.nowgo.space/api/naver-search?kind=blog&q=서울',{headers:{authorization:'Bearer stale-token'}})))));
 assert.deepEqual(api.counts,{fetches:0,environmentReads:0});
});
test('disabled handler does not inspect requests or expose query/token contents',async()=>{
 const api=route();
 const req=new Proxy({},{get(){throw Error('Request must not be inspected')}});
 await assertDisabled(await api.GET(req));
 assert.deepEqual(api.counts,{fetches:0,environmentReads:0});
});
test('production sources retain no NAVER provider endpoint, credential access, or inbound search caller',()=>{
 const root=new URL('../',import.meta.url),files=[];
 function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file);else if(/\.(?:tsx?|m?js|html)$/.test(entry.name))files.push(file)}}
 for(const directory of ['app','components','hooks','lib','config','scripts','public','vendor','supabase'])walk(fileURLToPath(new URL(directory,root)));
 for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  assert.doesNotMatch(text,/naverapihub\.apigw\.ntruss\.com|openapi\.naver\.com|oapi\.map\.naver\.com|NAVER_CLIENT_(?:ID|SECRET)|X-NCP-APIGW-API-KEY/i,file);
  assert.doesNotMatch(text,/from\s+['"][^'"]*naver-hub['"]|(?:import|require)\s*\(\s*['"][^'"]*naver-hub['"]|\/api\/naver-search/,file);
 }
});
