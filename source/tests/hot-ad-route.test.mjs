import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as policy from '../lib/hot-ad-policy.ts';
import {isKoreanCoordinate} from '../lib/korean-region.ts';
function load(auth,publicClient={rpc:async()=>({data:[],error:null})}){
 const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../app/api/hot-ads/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const deps={'@/lib/hot-ad-payments':{hotAdPaymentConfig:()=>({ready:false})},'@/lib/supabase':{verifiedUser:async()=>auth,publicDb:()=>publicClient},'@/lib/server':{reply:(_req,body,status=200)=>({body,status}),validOrigin:req=>req.headers.get('origin')===new URL(req.url).origin},'@/lib/hot-ad-policy':policy,'@/lib/korean-region':{isKoreanCoordinate}};
 vm.runInNewContext(code,{exports,require:n=>deps[n],URL,Request,Number,JSON});return exports;
}
const request=(body,origin='https://hot.nowgo.space')=>new Request('https://hot.nowgo.space/api/hot-ads',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});
test('signed-out and cross-origin users cannot submit or manage advertisements',async()=>{
 assert.equal((await load(null).POST(request({action:'bid'}))).status,401);
 assert.equal((await load({user:{id:'owner'}}).POST(request({action:'bid'},'https://foreign.example'))).status,403);
});
test('the bidder cannot supply activation or payment state; server only calls the bid RPC',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:'bid',error:null}}};
 const result=await load({user:{id:'owner'},client}).POST(request({action:'bid',budget:8000,reference:'similar',terms:policy.HOT_AD_TERMS,auctionId:'auction',storeId:'store',menuId:'menu',status:'active',paid:true,ownerId:'forged'}));
 assert.equal(result.status,200);assert.equal(calls[0].name,'ng_hot_ad_submit');assert.equal('p_owner' in calls[0].args,false);assert.equal('status' in calls[0].args,false);assert.equal('paid' in calls[0].args,false);
 assert.equal((await load({user:{id:'owner'},client}).POST(request({action:'bid',budget:7999,reference:'similar',terms:policy.HOT_AD_TERMS}))).status,400);
});
test('no location means no advertising slot request, and public responses stay limited',async()=>{
 let calls=0;const route=load(null,{rpc:async()=>{calls++;return {data:[{menu_id:'one',ramen_reference:'similar'}],error:null}}});
 assert.equal((await route.GET(new Request('https://hot.nowgo.space/api/hot-ads?action=slot'))).body.slot,null);assert.equal(calls,0);
 const result=await route.GET(new Request('https://hot.nowgo.space/api/hot-ads?action=slot&lat=37.544&lng=127.055'));
 assert.equal(result.body.slot.menu_id,'one');assert.equal(calls,1);
});
