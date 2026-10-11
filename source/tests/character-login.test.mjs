import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../components/app-report-login.tsx',import.meta.url),'utf8');
const start=source.indexOf(' useEffect('),end=source.indexOf(' async function saveFavorite',start);
const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
async function run({session=true,consent=false}={}){
 const redirects=[],states=[],messages=[];
 let pending;
 const context={app:false,character:true,channel:'',role:'customer',entry:false,variant:'hot',favoriteStoreId:undefined,returnTo:'/app/report-login?role=customer&mode=character',isAppLoginChannel:()=>false,browserDb:()=>({auth:{getSession:async()=>({data:{session:session?{access_token:'private',refresh_token:'private'}:null}})}}),api:async()=>({customer:consent?null:{id:'own-account'},consentRequired:consent}),location:{replace:p=>redirects.push(p)},window:{opener:null},setState:s=>states.push(s),setMessage:s=>messages.push(s),useEffect:fn=>{fn()}};
 vm.createContext(context);vm.runInContext(code,context);await new Promise(resolve=>setImmediate(resolve));return{redirects,states,messages};
}
test('verified character login returns without a popup opener',async()=>{const r=await run();assert.deepEqual(r.redirects,['/app']);assert.ok(!r.states.includes('error'))});
test('missing session shows login choices without pretending to log in',async()=>{const r=await run({session:false});assert.deepEqual(r.states,['guest']);assert.deepEqual(r.redirects,[])});
test('required consent is completed before returning to character',async()=>{const r=await run({consent:true});assert.ok(r.redirects[0].startsWith('/account/join?type=user&returnTo='));assert.equal(r.redirects.length,1);assert.ok(decodeURIComponent(r.redirects[0]).includes('mode=character'))});
