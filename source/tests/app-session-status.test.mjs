import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const s=fs.readFileSync(new URL('../components/app-session-status.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(s.slice(s.indexOf(' useEffect('),s.indexOf('\n return null;')),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const channel='aa123456-1234-1234-1234-123456789abc';
async function run({session=true,verified=true}={}){
 let receive,signouts=0;const sent=[];const parent={postMessage:(data,origin)=>sent.push({data,origin})};
 const auth={getSession:async()=>({data:{session:session?{user:{is_anonymous:false}}:null}}),signOut:async options=>{assert.equal(options.scope,'local');signouts++;return{}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})};
 const ctx={window:{parent,addEventListener:(kind,fn)=>{if(kind==='message')receive=fn},removeEventListener(){}},document:{referrer:'https://hot.nowgo.space/nowgo-app.html'},location:{origin:'https://hot.nowgo.space'},APP_PARENT_ORIGIN:'https://app.example',isAppLoginChannel:v=>v===channel,browserDb:()=>({auth}),api:async()=>({customer:verified?{}:null,consentRequired:!verified}),useEffect:fn=>fn(),setTimeout,URL,localStorage:{setItem(){},removeItem(){}} };vm.createContext(ctx);vm.runInContext(code,ctx);
 const send=async(type,source=parent,origin=ctx.location.origin)=>{await receive({source,origin,data:{type,channel}});await new Promise(resolve=>setImmediate(resolve))};
 return{sent,send,signouts:()=>signouts};
}
test('persistent session is accepted only after server verifies customer and consent',async()=>{const r=await run();await r.send('nowgo:session-probe');assert.equal(r.sent[0].data.status,'authenticated');assert.deepEqual(Object.keys(r.sent[0].data).sort(),['channel','status','type']);});
test('missing and unverified sessions do not restore a signed-in UI',async()=>{for(const input of [{session:false},{verified:false}]){const r=await run(input);await r.send('nowgo:session-probe');assert.equal(r.sent[0].data.status,'signed-out')}});
test('logout requires the exact parent origin, window and active request',async()=>{const r=await run();await r.send('nowgo:session-probe');await r.send('nowgo:session-logout',{},'https://hot.nowgo.space');assert.equal(r.signouts(),0);await r.send('nowgo:session-logout',undefined,'https://evil.example');assert.equal(r.signouts(),0);await r.send('nowgo:session-logout');assert.equal(r.signouts(),1);assert.equal(r.sent.at(-1).data.status,'signed-out')});
