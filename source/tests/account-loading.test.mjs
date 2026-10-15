import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function compile(path,mocks,globals={}){const exports={};const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:n=>mocks[n]||{},setTimeout,clearTimeout,setInterval,clearInterval,...globals});return exports;}
const tick=()=>new Promise(r=>setTimeout(r,10));
test('initial login events share one snapshot and token refresh keeps the realtime channel',async()=>{
 const session={user:{id:'user-a',is_anonymous:false}},load=deferred(),effects=[];
 let authListener,channels=0,removed=0,calls=0;const values=[];
 const client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{authListener=fn;return {data:{subscription:{unsubscribe(){}}}}}},channel:()=>{channels++;return {on(){return this;},subscribe(){}};},removeChannel(){removed++;}};
 const react={useState:init=>[init,value=>values.push(value)],useRef:init=>({current:init}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
 const {useActivity}=compile('../components/activity/use-activity.ts',{'react':react,'@/lib/client':{api:()=>{calls++;return load.promise;}},'@/lib/supabase-browser':{browserDb:()=>client}},{document:{hidden:false,addEventListener(){},removeEventListener(){}},window:{addEventListener(){},removeEventListener(){}}});
 const state=useActivity('hot',true),cleanup=effects[0]();
 authListener('INITIAL_SESSION',session);await tick();
 assert.equal(calls,1);assert.equal(channels,1);
 authListener('TOKEN_REFRESHED',session);await tick();assert.equal(channels,1);assert.equal(removed,0);
 const snapshot={xp:42};load.resolve(snapshot);await tick();assert.ok(values.includes(snapshot));
 await state.refresh();assert.equal(calls,2);cleanup();assert.equal(removed,1);
});
test('snapshot starts all independent data reads before any one finishes',async()=>{
 const waits=[deferred(),deferred(),deferred()],started=[];
 const builder={select(){return this;},eq(){return this;},then(resolve,reject){started.push('visits');return waits[2].promise.then(resolve,reject);}};
 const client={rpc:name=>{const index=name==='ng_planet_snapshot'?0:1;started.push(name);return waits[index].promise;},from:()=>builder};
 const {GET}=compile('../app/api/activity/[action]/route.ts',{'@/lib/supabase':{verifiedUser:async()=>({user:{id:'user-a'},client})},'@/lib/server':{reply:(_req,data)=>data,failure:(_req,e)=>{throw e;}},'@/lib/site-config':{variantForHost:()=> 'hot'},'@/lib/activity/model':{planetForVariant:v=>v}});
 const result=GET({headers:{get:()=> 'hot.nowgo.space'}},{params:Promise.resolve({action:'snapshot'})});await tick();
 assert.equal(started.length,3);
 waits[0].resolve({data:{photos:[],reviews:[],visits:[{id:'v1'}],notifications:[]},error:null});
 waits[1].resolve({data:{cases:[]},error:null});waits[2].resolve({data:[{id:'v1',challenge_title:'challenge'}],error:null});
 const snapshot=await result;assert.equal(snapshot.visits[0].challenge_title,'challenge');
});
