import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as payments from '../lib/hot-ad-payments.ts';
const config={ready:true,storeId:'approved-store',channelKey:'approved-channel',serviceKey:'test-only'};
const receipt={id:'hotad_order',status:'PAID',storeId:config.storeId,currency:'KRW',transactionId:'verified-tx',channel:{key:config.channelKey,type:'LIVE',pgProvider:'KCP_V2'},amount:{total:8800,cancelled:0}};
function load({auth=true,ready=true,payment=receipt,orderError=false,activationError=false,admin=false}={}){
 const calls=[],client={rpc:async(name,args)=>{calls.push({name,args});return name==='is_admin'?{data:admin}:name==='ng_hot_ad_checkout'?{data:{orderId:'hotad_order',amount:8800},error:orderError?'not_owner':null}:{data:null}}};
 const db={rpc:async(name,args)=>{calls.push({name,args});return {error:activationError?'unavailable':null}}},exports={};
 const deps={'@supabase/supabase-js':{createClient:()=>db},'@/lib/supabase':{publicConfig:()=>({url:'https://example.invalid'}),verifiedUser:async()=>auth?{user:{id:'owner'},client}:null},'@/lib/server':{reply:(_req,body,status=200)=>({body,status}),validOrigin:r=>r.headers.get('origin')===new URL(r.url).origin},'@/lib/hot-ad-payments':{...payments,hotAdPaymentConfig:()=>({...config,ready}),fetchAdPayment:async()=>{calls.push({name:'provider_lookup'});return payment}}};
 const code=ts.transpileModule(fs.readFileSync(new URL('../app/api/hot-ads/checkout/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>deps[n],JSON,URL,Request,Response,AbortSignal});return {route:exports,calls};
}
const req=(body,origin='https://hot.nowgo.space')=>new Request('https://hot.nowgo.space/api/hot-ads/checkout',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});
test('unconfigured and unauthenticated checkout never requests a provider payment',async()=>{
 for(const settings of [{ready:false},{auth:false}]){const {route,calls}=load(settings);assert.ok((await route.POST(req({action:'start',bidId:'bid'}))).status>=400);assert.equal(calls.length,0)}
});
test('client success, forged amount, wrong channel and test receipts cannot activate an ad',async()=>{
 for(const payment of [{...receipt,amount:{total:8000,cancelled:0}},{...receipt,status:'FAILED'},{...receipt,channel:{...receipt.channel,type:'TEST'}}]){
  const {route,calls}=load({payment});const result=await route.POST(req({action:'confirm',bidId:'bid',paymentId:'hotad_order',paid:true,amount:8800}));assert.equal(result.status,409);assert.equal(calls.some(c=>c.name==='ng_hot_ad_confirm'),false);
 }
});
test('confirmation uses server order amount and provider transaction ID',async()=>{
 const {route,calls}=load();assert.equal((await route.POST(req({action:'confirm',bidId:'bid',paymentId:'hotad_order',amount:1,paymentKey:'forged'}))).status,200);
 const args=calls.find(c=>c.name==='ng_hot_ad_confirm').args;assert.equal(args.p_amount,8800);assert.equal(args.p_key,'verified-tx');
});
test('another owner or another payment ID cannot activate this order',async()=>{
 for(const settings of [{orderError:true},{}]){const {route,calls}=load(settings);assert.ok((await route.POST(req({action:'confirm',bidId:'bid',paymentId:'other'}))).status>=400);assert.equal(calls.some(c=>c.name==='provider_lookup'),false)}
});
test('non-admin cannot refund; failed activation is visible and retryable',async()=>{
 const owner=load();assert.equal((await owner.route.POST(req({action:'refund',bidId:'bid'}))).status,403);assert.equal(owner.calls.some(c=>c.name==='provider_lookup'),false);
 const unavailable=load({activationError:true});const result=await unavailable.route.POST(req({action:'confirm',bidId:'bid',paymentId:'hotad_order'}));assert.equal(result.status,503);assert.equal(result.body.code,'payment_activation_pending');
});
