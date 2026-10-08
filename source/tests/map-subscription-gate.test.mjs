import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function render(status,required=true){
 const effects=[];let index=0;const values=[status,false,''];
 const dialog={open:false,showModal(){this.open=true},close(){this.open=false}};
 const React={createElement(type,props,...children){return {type,props:props??{},children}}};
 const hooks={useState(){return [values[index++],()=>{}]},useRef(){return {current:dialog}},useCallback(fn){return fn},useEffect(fn){effects.push(fn)},useSyncExternalStore(_subscribe,_snapshot,serverSnapshot){return serverSnapshot()}};
 const source=fs.readFileSync(new URL('../components/owner/map-subscription-settings.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 const exports={};let unlocked=0;
 vm.runInNewContext(code,{exports,React,Date,URL,window:{addEventListener(){},removeEventListener(){}},setInterval(){return 1},clearInterval(){},require(name){return name==='react'?hooks:name==='next/link'?{default:'link'}:name.endsWith('.module.css')?{default:{}}:name==='@/lib/site-config'?{siteConfig:()=>({name:'HOT',accent:'#ec492d'})}:{api:async()=>status}}});
 const tree=exports.default({ownerVerified:true,required,onActivated(){unlocked++}});
 effects.forEach(fn=>fn());
 const nodes=[];function walk(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(walk);return}nodes.push(value);value.children?.forEach(walk)}walk(tree);
 return {dialog,nodes,unlocked};
}
const paid={status:'active',expiresAt:'2099-01-01',checkedAt:Date.now(),isTest:false};
test('unsubscribed owner is automatically blocked and Escape cannot close the dialog',()=>{
 const {dialog,nodes,unlocked}=render(null);
 assert.equal(dialog.open,true);assert.equal(unlocked,0);
 const popup=nodes.find(n=>n.type==='dialog');let prevented=false;
 popup.props.onCancel({preventDefault(){prevented=true}});assert.equal(prevented,true);
 assert.equal(nodes.some(n=>n.children.includes('닫기')),false);
 dialog.close();popup.props.onClose();assert.equal(dialog.open,true);
});
test('a verified paid period unlocks the workspace',()=>{
 const {dialog,unlocked}=render(paid);assert.equal(dialog.open,false);assert.equal(unlocked,1);
});
test('test payments and expired periods keep the paywall open',()=>{
 for(const status of [{...paid,isTest:true},{...paid,expiresAt:'2020-01-01'}])assert.equal(render(status).dialog.open,true);
});
test('subscription settings outside the paywall remain dismissible',()=>{
 const {dialog,nodes}=render(null,false);assert.equal(dialog.open,false);
 assert.equal(nodes.some(n=>n.children.includes('닫기')),true);
});
test('new checkout remains unavailable even if the legacy backend reports ready',()=>{
 const {nodes}=render({ready:true,status:'none',isTest:false});
 const checkout=nodes.find(n=>n.type==='button'&&n.children.includes('Paddle 결제 준비 중'));
 assert.equal(checkout.props.disabled,true);
 assert.equal(checkout.props.onClick,undefined);
});
