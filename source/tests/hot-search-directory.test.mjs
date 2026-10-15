import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {nearbyPath,storeLocality} from '../lib/hot-search.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';
const code=fs.readFileSync(new URL('../lib/hot-search-directory.ts',import.meta.url),'utf8');
function reader({stores=[],hidden=[],error=null,complete=true,enabled=true}={}){
 const exports={};
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,AbortSignal,process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:String(enabled)}},require:name=>({
  react:{cache:fn=>fn},'./sourced-store-feed':{readSourcedStoreFeed:async()=>({stores,complete})},'./supabase':{publicDb:()=>({rpc:()=>({abortSignal:async()=>({data:hidden,error})})})},
 })[name]});return exports.readHotSearchStores;
}
test('directory excludes hidden and NOINDEX stores while preserving eligible public source identity',async()=>{
 const stores=[sourceStore(1,{indexable:true}),sourceStore(2,{indexable:true}),sourceStore(3,{indexable:false}),sourceStore(4)];
 const result=await reader({stores,hidden:[stores[1].id]})();assert.equal(result.length,1);assert.equal(result[0].id,stores[0].id);
});
test('visibility failure or incomplete feed never publishes a partial search directory',async()=>{
 await assert.rejects(reader({error:{message:'offline'}})(),/visibility/);
 await assert.rejects(reader({complete:false})(),/incomplete/);
 assert.equal((await reader({enabled:false})()).length,0);
});
test('regional and pagination links encode published address text and stable page URLs',()=>{
 assert.equal(storeLocality(' 서울특별시   마포구 월드컵로 1 '),'서울특별시 마포구');
 assert.equal(nearbyPath(),'/nearby');assert.equal(nearbyPath(undefined,2),'/nearby?page=2');
 assert.equal(decodeURIComponent(nearbyPath('서울특별시 마포구',3)),'/nearby/서울특별시 마포구?page=3');
});
