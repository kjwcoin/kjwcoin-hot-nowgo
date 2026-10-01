import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseOwnerCommand} from '../lib/owner-operations.ts';
function load(auth) {
  const output=ts.transpileModule(fs.readFileSync(new URL('../app/api/owner/operations/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={},dependencies={
    '@/lib/supabase':{verifiedUser:async()=>auth},
    '@/lib/owner-operations':{parseOwnerCommand},
    '@/lib/server':{reply(_req,body,status=200){return {body,status}},validOrigin(req){return req.headers.get('origin')===new URL(req.url).origin},failure(_req,error){throw error}},
  };
  vm.runInNewContext(output,{exports,require(name){return dependencies[name]},Request});return exports;
}
const store='9de799ef-88c3-425a-a764-ec9f085f31d8';
const body={storeId:store,requestId:store,kind:'open_status',value:'open',active:true,expiryMode:'business_day',actorId:'forged-actor'};
const request=(override={},origin='https://hot.nowgo.space')=>new Request('https://hot.nowgo.space/api/owner/operations',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({...body,...override})});
test('a signed-out account cannot query or change owner state',async()=>{
  const route=load(null);assert.equal((await route.GET(request())).status,401);assert.equal((await route.POST(request())).status,401);
});
test('foreign origins and invented statuses never reach the state RPC',async()=>{
  const route=load({user:{id:'real-owner'},client:{rpc(){throw new Error('RPC should not execute')}}});
  assert.equal((await route.POST(request({},'https://foreign.example'))).status,403);
  assert.equal((await route.POST(request({value:'invented'}))).status,400);
});
test('the mutation never forwards a client-supplied owner ID or timestamp',async()=>{
  const calls=[];const route=load({user:{id:'real-owner'},client:{rpc:async(name,args)=>{calls.push({name,args});return {data:{saved:true},error:null}}}});
  assert.equal((await route.POST(request())).status,200);
  assert.equal(calls[0].name,'ng_map_set_owner_status');assert.equal(calls[0].args.p_store,store);
  assert.equal('p_actor_id' in calls[0].args,false);assert.equal('actorId' in calls[0].args,false);assert.equal('p_occurred_at' in calls[0].args,false);
});
test('subscription and trust suspension failures are shown without claiming a save',async()=>{
  for(const message of ['OWNER_TRUST_SUSPENDED','SUBSCRIPTION_REQUIRED']){
    const route=load({user:{id:'real-owner'},client:{rpc:async()=>({data:null,error:{message}})}});
    const result=await route.POST(request());assert.equal(result.status,403);assert.ok(result.body.error);assert.equal(result.body.saved,undefined);
  }
});
