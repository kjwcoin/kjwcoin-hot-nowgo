import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/api/naver-search/route.ts',import.meta.url),'utf8');
function route({authenticated=true,allowed=true,search=async()=>({kind:'local',provider:'NAVER API HUB',items:[],total:0}),authError=false}={}){
 const calls=[],exports={};class NaverSearchUnavailable extends Error{constructor(code){super(code);this.code=code}}
 const dependencies={'@/lib/naver-hub':{naverHubSearch:async(...args)=>{calls.push(args);return search(...args,NaverSearchUnavailable)},NaverSearchUnavailable},'@/lib/naver-search-limit':{allowNaverSearch(id){assert.equal(id,'verified-user');return allowed}},'@/lib/server':{reply(req,body,status=200){return {body,status}}},'@/lib/supabase':{async verifiedUser(){if(authError)throw Error('auth unavailable');return authenticated?{user:{id:'verified-user'}}:null}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,require(name){assert.ok(name in dependencies,'Unexpected dependency: '+name);return dependencies[name]}});
 return {calls,GET:query=>exports.GET(new Request('https://hot.nowgo.space/api/naver-search?'+query))};
}
test('anonymous callers cannot consume upstream search quota',async()=>{const api=route({authenticated:false});assert.equal((await api.GET('kind=local&q=서울')).status,401);assert.equal(api.calls.length,0)});
test('invalid query/kind and rate limits never reach NAVER',async()=>{for(const query of ['kind=image&q=서울','kind=local&q=a']){const api=route();assert.equal((await api.GET(query)).status,400);assert.equal(api.calls.length,0)}const limited=route({allowed:false});assert.equal((await limited.GET('kind=blog&q=서울')).status,429);assert.equal(limited.calls.length,0)});
test('local and blog remain separate successful result types',async()=>{for(const kind of ['local','blog']){const api=route({search:async(kind)=>({kind,items:[],total:0})});const result=await api.GET('kind='+kind+'&q=서울');assert.equal(result.status,200);assert.equal(result.body.kind,kind);assert.match(result.body.notice,/참고자료/);assert.equal(api.calls.length,1)}});
test('missing credentials and upstream failure are distinct without private error details',async()=>{const missing=route({search:async(a,b,ErrorType)=>{throw new ErrorType('not_configured')}});assert.equal((await missing.GET('kind=local&q=서울')).status,503);const failure=route({search:async()=>{throw Error('secret value')}});const response=await failure.GET('kind=local&q=서울');assert.equal(response.status,502);assert.doesNotMatch(JSON.stringify(response),/secret value/)});
test('auth service failures return a bounded safe response',async()=>{assert.equal((await route({authError:true}).GET('kind=local&q=서울')).status,502)});
