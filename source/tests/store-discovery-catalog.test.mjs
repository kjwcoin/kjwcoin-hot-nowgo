import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=fs.readFileSync(new URL('../lib/store-discovery-catalog.ts',import.meta.url),'utf8');
const exports={};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({})});
const {collectLegacyPlaceIds}=exports;
const makeRows=n=>Array.from({length:n},(_,i)=>({id:String(i),place_id:'store-'+i,shop:'식당 '+i}));
test('4000 future stores are read in bounded batches without truncation or static builds',async()=>{
 const rows=makeRows(4000),calls=[];
 const ids=await collectLegacyPlaceIds(async(offset,size)=>{calls.push([offset,size]);return {rows:rows.slice(offset,offset+size),total:rows.length}});
 assert.equal(ids.length,4000);assert.equal(calls.length,8);assert.ok(calls.every(([,size])=>size===500));assert.ok(ids.includes('store-3999'));
});
test('server row caps below requested batch still enumerate the complete catalog',async()=>{
 const rows=makeRows(1201);let calls=0;
 const ids=await collectLegacyPlaceIds(async offset=>{calls++;return {rows:rows.slice(offset,offset+100),total:rows.length}});
 assert.equal(ids.length,1201);assert.equal(calls,13);
});
test('multiple menus for a store are deduplicated without merging different IDs or names',async()=>{
 const rows=[{id:'1',place_id:'busan',shop:'같은 상호'},{id:'2',place_id:'seoul',shop:'같은 상호'},{id:'3',place_id:'busan',shop:'같은 상호'},{id:'4',place_id:'demo',shop:'나우고'}];
 const ids=await collectLegacyPlaceIds(async()=>({rows,total:4}));assert.equal(ids.length,2);assert.ok(ids.includes('busan'));assert.ok(ids.includes('seoul'));
});
test('empty, failed, changing and repeated partial reads fail instead of publishing a subset',async()=>{
 assert.equal((await collectLegacyPlaceIds(async()=>({rows:[],total:0}))).length,0);
 await assert.rejects(collectLegacyPlaceIds(async()=>({rows:[],total:1})),/incomplete/);
 await assert.rejects(collectLegacyPlaceIds(async()=>{throw Error('offline')}),/offline/);
 await assert.rejects(collectLegacyPlaceIds(async offset=>({rows:[{id:String(offset),place_id:'a',shop:'a'}],total:offset===0?2:3})),/changed/);
 await assert.rejects(collectLegacyPlaceIds(async()=>({rows:[{id:'1',place_id:'a',shop:'a'}],total:2})),/changed/);
});
