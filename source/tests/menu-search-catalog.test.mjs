import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as search from '../lib/menu-search.ts';

function split(expression){let depth=0,start=0;const parts=[];for(let i=0;i<expression.length;i++){if(expression[i]==='(')depth++;if(expression[i]===')')depth--;if(expression[i]===','&&depth===0){parts.push(expression.slice(start,i));start=i+1}}parts.push(expression.slice(start));return parts;}
// A local fixed-grammar PostgREST model checks encoded-query/client parity. Live
// endpoint verification is still required before claiming DB operator support.
function predicate(expression,row){
 if(expression.startsWith('and('))return split(expression.slice(4,-1)).every(term=>predicate(term,row));
 if(expression.startsWith('or('))return split(expression.slice(3,-1)).some(term=>predicate(term,row));
 const parts=split(expression);if(parts.length>1)return parts.some(term=>predicate(term,row));
 const [column,operator,...value]=expression.split('.');assert.equal(operator,'imatch');assert.ok(['menu','shop','address'].includes(column));
 return new RegExp(value.join('.').replaceAll('[^[:alnum:]]*','[^\\p{L}\\p{N}]*'),'iu').test(row[column]);
}
const row={id:'12345678-1234-4234-8234-123456789abc',place_id:'reported-a',menu:'매운 돈가스',shop:'ABC 시험 가게',price:10000,heat:3,flavor:'칼칼한',category:'기타',lat:37.5,lng:127,address:'서울 중구 시험길 1',observed_at:'2026-10-13',verified_owner:false,nowgo_slug:null,owner_store_id:null,soldout:false,map_menu_photo:false,photo_path:null};
function catalog(rows=[row]){
 const exports={},calls=[];
 const dependencies={
  './menu-search.ts':search,
  './supabase':{publicConfig:()=>({ready:true,url:'https://test.invalid'}),publicDb:()=>({
   from(table){calls.push(['from',table]);let conditions=[];const builder={select(value){calls.push(['select',value]);return this},or(value){calls.push(['or',value]);conditions.push(r=>predicate(value,r));return this},eq(key,value){calls.push(['eq',key,value]);conditions.push(r=>r[key]===value);return this},lte(key,value){calls.push(['lte',key,value]);conditions.push(r=>r[key]<=value);return this},gte(key,value){calls.push(['gte',key,value]);conditions.push(r=>r[key]>=value);return this},order(key,value){calls.push(['order',key,value]);return this},range(start,end){calls.push(['range',start,end]);return Promise.resolve({data:rows.filter(r=>conditions.every(test=>test(r))).slice(start,end+1),error:null})}};return builder},
   async rpc(name,args){calls.push(['rpc',name,args]);return {data:[],error:null}},
  })},
  './site-config':{siteConfig:()=>({tables:{menus:'ng_map_hot_menu_catalog'}})},
  './nearby-demo':{MAP_RADIUS_KM:15,distanceKm:()=>0},
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/menu-catalog.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env:{}},require:name=>{assert.ok(name in dependencies,name);return dependencies[name]}});
 return {...exports,calls};
}

test('generated literal pattern/client matcher agree on names, menus, mixed order, case and Korean spacing',()=>{
 for(const query of ['매운돈가스','매 운 돈 가 스','시험가게','시험 가게 돈가스','돈가스 시험가게','ａｂｃ 매운돈가스','서울 시험가게 돈가스','ABC 존재하지않는메뉴']){
  const encoded=search.catalogMenuSearchFilter(query);
  assert.equal(predicate(encoded,row),search.matchesMenuSearch([row.menu,row.shop,row.address],query),query);
 }
 assert.equal(predicate(search.catalogMenuSearchFilter('매운돈가스'),{...row,menu:'매운짜장돈가스'}),false,'no arbitrary text gap');
 assert.equal(predicate(search.catalogMenuSearchFilter('시험가게'),{...row,shop:'시험 · 가게'}),true);
 assert.equal(search.matchesMenuSearch(['ＡＢＣ 시험가게'],'abc'),false,'stored fullwidth letters remain literal, matching the DB query contract');
 assert.equal(predicate(search.catalogMenuSearchFilter('abc'),{...row,shop:'ＡＢＣ 시험가게'}),false);
});

test('query bounds reject excess meaningful text/terms with clear messages rather than truncation',()=>{
 assert.match(search.menuSearchError('가'.repeat(61)),/60자/);
 assert.match(search.menuSearchError('가 나 다 라 마 바 사 아 자'),/8개/);
 assert.equal(search.menuSearchError('가 나 다 라 마 바 사 아'),null);
 assert.equal(search.menuSearchError('가 가 가 가 가 가 가 가 가'),null,'duplicate words add no condition');
 assert.equal(search.matchesMenuSearch([row.menu,row.shop,row.address],'가'.repeat(61)),false);
 assert.throws(()=>search.catalogMenuSearchFilter('가 나 다 라 마 바 사 아 자'),/8개/);
 assert.equal(search.catalogMenuSearchFilter('  %(),.  '),null);
});

test('untrusted regex/PostgREST punctuation cannot become filter syntax',()=>{
 const normalized=search.normalizedMenuQuery('시험%,address.not.is.null( )');assert.equal(normalized,'시험addressnotisnull');
 const clause=search.catalogMenuSearchFilter('시험%,address.not.is.null( )');
 assert.equal((clause.match(/\.imatch\./g)||[]).length,3);assert.doesNotMatch(clause,/\.not\.|\.is\.|\.null|\||\+|\$|\{/);
 assert.equal(search.matchesMenuSearch([row.menu,row.shop,row.address],'시험%,address.not.is.null( )'),false);
});

test('real community catalog function supports owner/customer names and menus with AND-of-field-OR',async()=>{
 for(const owner of [false,true])for(const query of ['매운돈가스','시험가게','시험가게 돈가스','돈가스 시험가게','ａｂｃ 돈가스']){
  const api=catalog([{...row,place_id:owner?'nowgo-owner-a':'reported-a',verified_owner:owner,owner_store_id:owner?'owner-a':null}]);
  const result=await api.communityMenus({query});assert.equal(result.menus.length,1,`${owner} ${query}`);assert.equal(result.menus[0].verifiedOwner,owner);
  assert.equal(api.calls.find(c=>c[0]==='or')[1],search.catalogMenuSearchFilter(query));
  assert.deepEqual(Array.from(api.calls.find(c=>c[0]==='range')),['range',0,100]);
 }
 const result=await catalog().communityMenus({query:'시험가게 없는메뉴'});assert.equal(result.menus.length,0);
});

test('catalog search retains price/heat/flavor/category, bounds, page range and owner proof work',async()=>{
 const api=catalog();const result=await api.communityMenus({query:'시험가게 돈가스',page:1,heat:3,maxHeat:4,flavor:'칼칼한',category:'기타',budget:10000,lat:37.5,lng:127,radiusKm:15});
 assert.equal(result.menus.length,0);const calls=api.calls;
 assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='heat'&&c[2]===3));assert.ok(calls.some(c=>c[0]==='lte'&&c[1]==='heat'&&c[2]===4));
 for(const key of ['flavor','category'])assert.ok(calls.some(c=>c[0]==='eq'&&c[1]===key));
 assert.ok(calls.some(c=>c[0]==='lte'&&c[1]==='price'&&c[2]===10000));
 for(const key of ['lat','lng'])for(const op of ['gte','lte'])assert.ok(calls.some(c=>c[0]===op&&c[1]===key));
 assert.deepEqual(Array.from(calls.find(c=>c[0]==='range')),['range',100,200]);
 assert.ok(calls.some(c=>c[0]==='rpc'&&c[1]==='ng_map_store_report_counts'));
 const ordinary=catalog();await ordinary.communityMenus({query:'돈가스'});assert.ok(ordinary.calls.some(c=>c[0]==='rpc'&&c[1]==='ng_map_matched_report_owners'));
});

test('oversized search causes zero database calls, while blank query preserves ordinary catalog browsing',async()=>{
 for(const query of ['가'.repeat(61),'가 나 다 라 마 바 사 아 자']){const api=catalog();const result=await api.communityMenus({query});assert.equal(result.menus.length,0);assert.equal(result.hasMore,false);assert.equal(api.calls.length,0)}
 const api=catalog();assert.equal((await api.communityMenus({query:''})).menus.length,1);assert.ok(!api.calls.some(c=>c[0]==='or'));
});
