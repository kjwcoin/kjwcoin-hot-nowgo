import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, deps) {
 const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 const exports={};
 vm.runInNewContext(code,{exports,require(name){if(!(name in deps))throw new Error('Unexpected import: '+name);return deps[name]},...deps.globals});
 return exports;
}
function activity(role, getSession=async()=>({data:{session:{user:{id:'owner-id'}}}})) {
 const values=[],refs=[];let stateIndex=0,refIndex=0;const calls=[];
 const hooks={useState(value){const index=stateIndex++;if(!(index in values))values[index]=value;return [values[index],value=>{values[index]=value}]},useRef(value){const index=refIndex++;return refs[index]??(refs[index]={current:value})},useCallback(fn){return fn},useEffect(){}};
 const module=load('../components/activity/use-activity.ts',{react:hooks,'@/lib/supabase-browser':{browserDb(){return {auth:{getSession}}}},'@/lib/client':{async api(path){calls.push(path);if(path.endsWith('login-target'))return typeof role==='function'?await role():{existingOwner:role};return {xp:10}}}});
 function render(planet){stateIndex=refIndex=0;return module.useActivity(planet)}
 return {render,calls};
}
for (const planet of ['hot','sweet','rich']) {
 test(planet+' owner is determined by the verified API and skips customer activity',async()=>{
  const app=activity(true);await app.render(planet).refresh();
  assert.equal(app.render(planet).owner,true);assert.equal(app.render(planet).data,null);
  assert.deepEqual(app.calls,['/api/customer/login-target']);
 });
 test(planet+' ordinary member retains customer activity',async()=>{
  const app=activity(false);await app.render(planet).refresh();
  assert.equal(app.render(planet).owner,false);assert.equal(app.render(planet).data.xp,10);
 });
}
test('failed role verification keeps owner/customer actions unresolved',async()=>{
 const app=activity(()=>{throw new Error('lookup unavailable')});await app.render('hot').refresh();
 assert.equal(app.render('hot').owner,null);assert.match(app.render('hot').error,/lookup unavailable/);
 assert.deepEqual(app.calls,['/api/customer/login-target']);
});
test('a late role response cannot restore an account after signout',async()=>{
 let resolve,session={user:{id:'owner-id'}};
 const app=activity(()=>new Promise(done=>resolve=done),async()=>({data:{session}}));
 const first=app.render('hot').refresh();for(let i=0;i<5;i++)await Promise.resolve();
 session=null;await app.render('hot').refresh();resolve({existingOwner:true});await first;
 assert.equal(app.render('hot').signedIn,false);assert.equal(app.render('hot').owner,null);
});
function panel(variant,owner){
 const React={createElement(type,props,...children){return {type,props:props??{},children}}};
 const regular=function RegularHomeLink(){};
 const module=load('../components/customer-panel.tsx',{
 react:{useState(value){return [value,()=>{}]}},'./regular-home-link':{default:regular},'lucide-react':{UserRound(){},LogOut(){}},
 '@/lib/supabase-browser':{browserDb(){}},'./customer-account.module.css':{default:{}},
 '@/components/ui/dialog':{Dialog(){},DialogContent(){},DialogTitle(){},DialogDescription(){}},'@/components/ui/button':{Button(){}},
 '@/lib/activity/model':{planetForVariant(value){return value},growth(){return {level:1}}},'next/dynamic':{default(){return function ActivityWorld(){}}},
 '@/components/activity/use-activity':{useActivity(){return {signedIn:true,owner,data:null,error:''}}},'@/components/activity/activity.css':{},'./activity/world-entry':{default(){}},globals:{React},
 });
 const tree=module.default({variant,regularHref:'https://nowgo.space/regular/home'});
 const nodes=[];function walk(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(walk);return}nodes.push(value);value.children?.forEach(walk)}walk(tree);
 return {nodes,regular};
}
for(const variant of ['hot','sweet','rich']){
 test(variant+' owner header replaces activity and favorites with store management',()=>{
  const {nodes,regular}=panel(variant,true);
  const links=nodes.filter(n=>n.type===regular);
  assert.equal(links.length,1);assert.equal(links[0].props.destination,'/owner/dashboard');assert.equal(links[0].children[0],'내 매장관리');
  assert.equal(nodes.some(n=>n.props['aria-label']==='내 활동'),false);
 });
 test(variant+' customer header keeps activity and favorites',()=>{
  const {nodes,regular}=panel(variant,false);
  assert.equal(nodes.some(n=>n.props['aria-label']==='내 활동'),true);
  assert.equal(nodes.find(n=>n.type===regular).children[0],'내 단골 목록');
 });
}
