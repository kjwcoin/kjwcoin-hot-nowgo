import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../components/naver-reference-search.tsx',import.meta.url),'utf8');
function harness(){
 const exports={},imports=[],counts={fetches:0};
 const React={createElement(type,props,...children){return {type,props:props||{},children}}};
 const dependencies={'next/link':{default:'Link'},'./naver-reference-search.module.css':{default:{page:'page',notice:'notice'}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,React,
  fetch(){counts.fetches++;throw Error('Network must not be used')},
  require(name){imports.push(name);assert.ok(name in dependencies,'Unexpected active client dependency: '+name);return dependencies[name]},
 });
 const walk=value=>!value?[]:Array.isArray(value)?value.flatMap(walk):typeof value==='object'?[value,...walk(value.children)]:[];
 return {render:()=>walk(exports.default()),imports,counts};
}
test('legacy search page renders a stopped-service notice and return-to-HOT link',()=>{
 const app=harness(),nodes=app.render();
 assert.ok(nodes.some(node=>node.type==='h1'&&node.children.includes('네이버 검색 기능 중단')));
 assert.ok(nodes.some(node=>node.type==='Link'&&node.props.href==='/'));
 assert.match(JSON.stringify(nodes),/HOT 지도에서 등록된 매장과 메뉴를 검색/);
 assert.deepEqual(app.counts,{fetches:0});
});
test('no input, submit, login prompt, result list, or interaction handler can trigger search',()=>{
 const app=harness();
 for(let render=0;render<3;render++)for(const node of app.render()){
  assert.equal(['form','input','select','button','ol','li'].includes(node.type),false);
  assert.ok(Object.keys(node.props).every(key=>!/^on[A-Z]/.test(key)));
  if(node.props.href)assert.equal(node.props.href,'/');
 }
 assert.deepEqual(app.imports,['next/link','./naver-reference-search.module.css']);
 assert.deepEqual(app.counts,{fetches:0});
 assert.doesNotMatch(source,/use client|useEffect|useState|setTimeout|addEventListener|\/api\/naver-search/);
});
test('HOT empty-result state keeps reset controls without the discontinued search link',()=>{
 const explorer=fs.readFileSync(new URL('../components/map-explorer.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(explorer,/naver-search|NAVER 검색 참고자료/);
 assert.match(explorer,/조건에 맞는 메뉴가 없어요/);
 assert.match(explorer,/<Button variant="outline" onClick=\{reset\}>조건 초기화<\/Button>/);
});
test('legacy page metadata announces the stop while retaining the shared header and noindex',()=>{
 const page=fs.readFileSync(new URL('../app/naver-search/page.tsx',import.meta.url),'utf8');
 assert.match(page,/title:'네이버 검색 기능 중단 \| NOWGO HOT'/);
 assert.match(page,/robots:\{index:false,follow:true\}/);
 assert.match(page,/<FlavorHeader\/><NaverReferenceSearch\/>/);
});
