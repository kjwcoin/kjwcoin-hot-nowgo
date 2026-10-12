import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/api/map-store-count/route.ts',import.meta.url),'utf8');

function route({invalid=false,failure=false,complete=true}={}){
 const exports={},calls=[];class InvalidViewportCountQuery extends Error{}
 const dependencies={
  '@/lib/server':{reply(_req,body,status=200){return {body,status}}},
  '@/lib/site-config':{variantForHost(host){calls.push(['host',host]);return host.startsWith('sweet.')?'sweet':host.startsWith('rich.')?'rich':'hot'}},
  '@/lib/viewport-store-count':{InvalidViewportCountQuery,parseViewportCountParams(params,variant){calls.push(['parse',params,variant]);if(invalid)throw new InvalidViewportCountQuery('bad input');return {bounds:{south:37,north:38,west:126,east:128}}},async viewportStoreCount(input,variant,signal){calls.push(['count',input,variant,signal]);if(failure)throw Error('private upstream details');return {count:12,complete,scope:'viewport',isMinimum:!complete}}},
 };
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,require(name){assert.ok(name in dependencies,'Unexpected dependency: '+name);return dependencies[name]}});
 return {calls,GET:(host='hot.nowgo.space')=>exports.GET(new Request('https://'+host+'/api/map-store-count?south=37&north=38&west=126&east=128&variant=rich',{headers:{host}}))};
}

test('public read-only route uses current host variant and forwards request cancellation',async()=>{
 for(const host of ['hot.nowgo.space','sweet.nowgo.space','rich.nowgo.space']){
  const api=route(),response=await api.GET(host);assert.equal(response.status,200);assert.equal(response.body.count,12);assert.equal(response.body.scope,'viewport');
  assert.equal(api.calls[2][2],host.split('.')[0]);assert.ok(api.calls[2][3] instanceof AbortSignal);
 }
 assert.doesNotMatch(source,/verifiedUser|service.role|\.rpc\(|export async function (POST|PUT|PATCH|DELETE)/);
});
test('invalid input is 400 before catalog access',async()=>{const api=route({invalid:true});const response=await api.GET();assert.equal(response.status,400);assert.equal(response.body.count,null);assert.equal(response.body.complete,false);assert.equal(api.calls.filter(call=>call[0]==='count').length,0)});
test('catalog failures are safe 503 unavailable responses rather than fabricated zero',async()=>{const response=await route({failure:true}).GET();assert.equal(response.status,503);assert.equal(response.body.count,null);assert.equal(response.body.complete,false);assert.doesNotMatch(JSON.stringify(response),/private upstream details/)});
test('bounded partial scan reaches the client as an explicit minimum',async()=>{const response=await route({complete:false}).GET();assert.equal(response.status,200);assert.equal(response.body.complete,false);assert.equal(response.body.isMinimum,true)});
