import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {sourceStore} from './fixtures/sourced-stores.mjs';
const source=fs.readFileSync(new URL('../app/sitemap.ts',import.meta.url),'utf8');
const robotsSource=fs.readFileSync(new URL('../app/robots.ts',import.meta.url),'utf8');
function load({host='hot.nowgo.space',preview=false,sourceIndexable=true,indexingReady=false,enabled=true,complete=true,legacy=['legacy-one','legacy-two'],failure=false}={}){
 const calls=[];
 const dependencies={
  'next/headers':{headers:async()=>new Headers({host})},
  '@/lib/source-store-preview':{sourcePreviewEnabled:()=>preview},
  '@/lib/site-config':{variantForHost:value=>value.startsWith('sweet.')?'sweet':value.startsWith('rich.')?'rich':'hot'},
  '@/lib/seo':{flavorOrigins:{hot:'https://hot.nowgo.space',sweet:'https://sweet.nowgo.space',rich:'https://rich.nowgo.space'},publicFlavorHost:host=>/^(hot|sweet|rich)\.nowgo\.space$/.test(host)},
  '@/lib/store-discovery-catalog':{readLegacyPlaceIds:async()=>{calls.push('legacy');if(failure)throw Error('unavailable');return legacy}},
  '@/lib/store-discovery':{STORE_DISCOVERY_INDEXING_READY:indexingReady,legacyStoreUrl:(id,variant)=>`https://${variant}.nowgo.space/place/${id}`},
  '@/lib/sourced-store-feed':{readSourcedStoreFeed:async()=>{calls.push('source');return {stores:[sourceStore(1,{slug:'hot-busan-1531',indexable:sourceIndexable})],complete}}},
  '@/lib/sourced-store':{sourcedStoreUrl:store=>'https://hot.nowgo.space/p/'+store.slug},
 };
 function compile(code){const exports={};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:enabled?'true':'false'}},require:name=>dependencies[name]});return exports.default}
 return {sitemap:compile(source),robots:compile(robotsSource),calls};
}
test('public HOT sitemap contains current legacy and complete source family with no invented lastmod',async()=>{
 const app=load({indexingReady:true}),entries=await app.sitemap();assert.equal(entries.length,5);
 assert.ok(entries.some(entry=>entry.url==='https://hot.nowgo.space/p/hot-busan-1531'));
 assert.ok(entries.some(entry=>entry.url==='https://hot.nowgo.space/place/legacy-two'));
 assert.ok(entries.every(entry=>Object.keys(entry).length===1));
 assert.equal((await app.robots()).sitemap,'https://hot.nowgo.space/sitemap.xml');
});
test('source incompleteness and legacy failures reject a successful partial sitemap',async()=>{
 await assert.rejects(load({complete:false,indexingReady:true}).sitemap(),/incomplete/);
 await assert.rejects(load({failure:true,indexingReady:true}).sitemap(),/unavailable/);
});
test('preview flag and nonpublic hosts suppress sitemap and block crawling without reading catalog',async()=>{
 for(const options of [{preview:true},{host:'preview.vercel.app'},{host:'localhost:3000'}]){
  const app=load(options);assert.equal((await app.sitemap()).length,0);assert.equal((await app.robots()).rules.disallow,'/');assert.equal(app.calls.length,0);
 }
});
test('disabled source family preserves the complete legacy catalog; unrelated flavors retain existing scope',async()=>{
 const app=load({enabled:false,indexingReady:true});assert.equal((await app.sitemap()).length,4);assert.deepEqual(app.calls,['legacy']);
 const other=load({host:'sweet.nowgo.space'});assert.equal((await other.sitemap()).length,2);assert.equal(other.calls.length,0);
});
test('oversize sitemap fails explicitly rather than truncating URLs',async()=>{
 await assert.rejects(load({enabled:false,indexingReady:true,legacy:Array.from({length:50000},(_,i)=>String(i))}).sitemap(),/requires_split/);
});

test('legacy gate remains conservative while eligible source pages are independently listed',async()=>{
 const app=load();assert.equal((await app.sitemap()).length,3);assert.deepEqual(app.calls,['source']);
});
test('NOINDEX source rows are not included and cannot inherit a legacy indexing flag',async()=>{
 const app=load({sourceIndexable:false,indexingReady:true});assert.equal((await app.sitemap()).length,4);assert.ok((await app.sitemap()).every(entry=>!entry.url.includes('/p/')));
});
