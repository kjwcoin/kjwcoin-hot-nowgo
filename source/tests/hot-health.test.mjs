import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/api/health/route.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function route({env={},database={data:[],error:null}}={}){
 const exports={};const calls=[];
 const query={select:value=>{calls.push(['select',value]);return query},limit:value=>{calls.push(['limit',value]);return query},abortSignal:async()=>database};
 const deps={'@/lib/supabase':{publicDb:()=>({from:table=>{calls.push(['table',table]);return query}})},'@/lib/site-config':{variantForHost:()=> 'hot',siteConfig:()=>({tables:{menus:'public_hot_catalog'}})}};
 vm.runInNewContext(code,{exports,require:name=>deps[name],process:{env},URL,Response,AbortSignal,Date});return {...exports,calls};
}
test('health only reads one public ID and reports a supplied deployment SHA',async()=>{
 const commit='a'.repeat(40);const h=route({env:{VERCEL_GIT_COMMIT_SHA:commit,VERCEL_ENV:'production'}});const response=await h.GET(new Request('https://hot.nowgo.space/api/health'));const body=await response.json();
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(body.version.commit,commit);assert.equal(body.version.environment,'production');assert.deepEqual(h.calls,[['table','public_hot_catalog'],['select','id'],['limit',1]]);assert.ok(Date.parse(body.checkedAt));
});
test('unknown deployment values stay unknown and database errors do not leak details',async()=>{
 const h=route({env:{VERCEL_GIT_COMMIT_SHA:'not-a-commit'},database:{data:null,error:{message:'private_detail'}}});const response=await h.GET(new Request('https://hot.nowgo.space/api/health'));const body=await response.json();
 assert.equal(response.status,503);assert.equal(body.status,'error');assert.equal(body.version.commit,null);assert.equal(body.version.environment,null);assert.ok(!JSON.stringify(body).includes('private_detail'));
});
