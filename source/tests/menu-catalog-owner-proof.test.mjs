import * as menuSearch from '../lib/menu-search.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const id='12345678-1234-4234-8234-123456789abc';
const base={id,place_id:'reported-a',menu:'매운맛 메뉴',shop:'실제 가게',price:10000,heat:3,flavor:'칼칼한',category:'닭발',lat:37.56,lng:126.97,address:'서울특별시 중구 길 1',observed_at:'2026-10-12',verified_owner:false,nowgo_slug:null,owner_store_id:null,soldout:false,map_menu_photo:false,photo_path:null};
function catalog(row,matches=[],matchError=null){
 const exports={},calls=[];const dependencies={'./menu-search.ts':menuSearch,
  './supabase':{publicConfig(){return {ready:true,url:'https://test.example'}},publicDb(){return {from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:row,error:null}}}},async rpc(name,args){calls.push({name,args});return {data:matches,error:matchError}}}}},'./site-config':{siteConfig(){return {tables:{menus:'ng_map_hot_menu_catalog'}}}},'./nearby-demo':{distanceKm(){return 0},MAP_RADIUS_KM:15},
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/menu-catalog.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env:{}},require(name){assert.ok(name in dependencies,'Unexpected import: '+name);return dependencies[name]}});return {...exports,calls};
}
test('a legacy store ID keeps status lookup available but cannot become approved owner evidence',async()=>{const api=catalog({...base,place_id:'nowgo-store-a',owner_store_id:'store-a'});const menu=await api.menuById(id);assert.equal(menu.ownerRegistered,true);assert.equal(menu.ownerClaimVerified,false);assert.equal(menu.ownerStoreId,'store-a');assert.equal(api.calls.length,0)});
test('approved owner RPC match upgrades store status without rewriting original report author',async()=>{const api=catalog(base,[{menu_id:id,store_id:'store-a',slug:'store'}]);const menu=await api.menuById(id);assert.equal(menu.ownerRegistered,true);assert.equal(menu.ownerClaimVerified,true);assert.equal(menu.verifiedOwner,false);assert.equal(menu.id,id);assert.equal(menu.placeId,'reported-a');assert.equal(api.calls[0].name,'ng_map_matched_report_owners')});
test('an unrelated match or failed verification does not approve a menu',async()=>{const api=catalog(base,[{menu_id:'other',store_id:'store-a',slug:'store'}]);assert.equal((await api.menuById(id)).ownerClaimVerified,false);await assert.rejects(catalog(base,[],new Error('verification unavailable')).menuById(id))});
test('the approved-owner catalogue author flag remains trusted server evidence',async()=>{const menu=await catalog({...base,place_id:'nowgo-store-a',owner_store_id:'store-a',verified_owner:true}).menuById(id);assert.equal(menu.verifiedOwner,true);assert.equal(menu.ownerClaimVerified,true)});
test('existing server proof contract requires approved claim and active owner, not mere registration',()=>{const sql=fs.readFileSync(new URL('../supabase/migrations/20261011110200_match_reported_store_owner.sql',import.meta.url),'utf8');assert.match(sql,/c\.status=''approved''/);assert.match(sql,/o\.status=''active''/);assert.match(sql,/having count\(\*\)=1/);assert.match(sql,/r\.place_id like ''reported-/)});
