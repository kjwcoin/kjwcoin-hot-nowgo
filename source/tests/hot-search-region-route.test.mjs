import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {nearbyPath,storeLocality,SEARCH_PAGE_SIZE} from '../lib/hot-search.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';

const require=createRequire(import.meta.url);
const stores=[
 sourceStore(1,{name:'청라쭈꾸미',address:'인천광역시 서해구 청라대로 127',indexable:true}),
 sourceStore(2,{name:'팔송정칼국수',address:'인천광역시 서해구 청라한내로72번길 7-25',indexable:true}),
 sourceStore(3,{name:'자강',address:'인천광역시 서해구 청라한내로 96 , 2층',indexable:true}),
 sourceStore(4,{address:'서울특별시 마포구 월드컵로 1',indexable:true}),
 sourceStore(5,{address:'테스트시 100%구 도로 1',indexable:true}),
 sourceStore(6,{address:'테스트시 A+B구 도로 2',indexable:true}),
];
const dependencies={
 'react/jsx-runtime':require('react/jsx-runtime'),
 'next/headers':{headers:async()=>new Headers({host:'hot.nowgo.space'})},
 'next/navigation':{notFound:()=>{throw Error('NEXT_HTTP_ERROR_FALLBACK;404')}},
 'next/link':{default:({children,...props})=>require('react').createElement('a',props,children)},
 '@/lib/hot-search-directory':{readHotSearchStores:async()=>stores},
 '@/lib/hot-search':{nearbyPath,storeLocality,SEARCH_PAGE_SIZE},
 '@/lib/store-discovery':{HOT_DISCOVERY_ORIGIN:'https://hot.nowgo.space',publicHotHost:()=>true,serializeJsonLd:JSON.stringify},
 '@/lib/sourced-store':{sourcedStoreUrl:store=>'https://hot.nowgo.space/p/'+store.slug,BRAND_COMMON_MENU_NOTICE:'브랜드 공통 메뉴',isBrandCommonMenu:()=>false},
 '@/lib/source-store-preview':{sourcePreviewEnabled:()=>false},
 '@/lib/site-config':{variantForHost:()=> 'hot'},
 '@/app/nearby/search.css':{},
};
function compile(path){
 const exports={};
 const code=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{
  assert.ok(name in dependencies,`Unexpected dependency ${name}`);return dependencies[name];
 }});
 return exports;
}
const directory=compile('../components/hot-search-directory.tsx');

test('nationwide directory hides aggregate summary while retaining cards and previous/next links',async()=>{
 const original=stores.slice();
 try{
  stores.splice(0,stores.length,...Array.from({length:SEARCH_PAGE_SIZE+1},(_,i)=>sourceStore(100+i,{indexable:true})));
  for(const page of ['1','2']){
   const body=renderToStaticMarkup(await directory.default({page}));
   assert.ok(!body.includes('공개 매장'));
   assert.ok(!body.includes(' / 2페이지'));
   assert.ok(body.includes('hot-search-cards'));
   assert.ok(body.includes('hot-search-regions'));
   assert.ok(body.includes('href="/"'));
   assert.ok(body.includes(page==='1'?'rel="next"':'rel="prev"'));
   assert.ok(!body.includes(page==='1'?'rel="prev"':'rel="next"'));
  }
 }finally{stores.splice(0,stores.length,...original);}
});
dependencies['@/components/hot-search-directory']={...directory,__esModule:true};
const route=compile('../app/nearby/[region]/page.tsx');
const props=(region,page)=>({params:Promise.resolve({region}),searchParams:Promise.resolve(page===undefined?{}:{page})});
async function html(region,page){const element=await route.default(props(region,page));return renderToStaticMarkup(await directory.default(element.props));}

test('regional route decodes the actual Next route parameter before matching published addresses',async()=>{
 for(const [region,count] of [['인천광역시 서해구',3],['서울특별시 마포구',1]]){
  const encoded=nearbyPath(region).slice('/nearby/'.length);
  const body=await html(encoded);
  assert.ok(body.includes(region+' 내 주변 매운 맛집'));
  assert.ok(body.includes(`공개 매장 ${count}곳`));
  if(count===3){for(const name of ['청라쭈꾸미','팔송정칼국수','자강'])assert.ok(body.includes(name));assert.ok(!body.includes('월드컵로 1'));}
 }
});
test('regional metadata uses readable address text and exactly one URL encoding',async()=>{
 const region='인천광역시 서해구',encoded=encodeURIComponent(region);
 const metadata=await route.generateMetadata(props(encoded));
 assert.equal(metadata.title,region+' 내 주변 매운 맛집 | 나우고 HOT');
 assert.equal(metadata.alternates.canonical,'https://hot.nowgo.space'+nearbyPath(region));
 assert.equal(metadata.openGraph.url,metadata.alternates.canonical);
 assert.ok(metadata.description.startsWith(region+' '));
});
test('route decodes once and preserves literal percent signs and plus signs',async()=>{
 for(const region of ['테스트시 100%구','테스트시 A+B구']){
  const metadata=await route.generateMetadata(props(encodeURIComponent(region)));
  assert.equal(metadata.alternates.canonical,'https://hot.nowgo.space'+nearbyPath(region));
  assert.ok((await html(encodeURIComponent(region))).includes(region+' 내 주변'));
 }
});
test('malformed, double-encoded, unknown and invalid-page routes remain 404',async()=>{
 for(const [region,page] of [['%E0%A4%A'],['%'],[encodeURIComponent(encodeURIComponent('인천광역시 서해구'))],[encodeURIComponent('인천광역시 서구')],[encodeURIComponent('인천광역시/서해구')],[encodeURIComponent('인천광역시 서해구'),'0'],[encodeURIComponent('인천광역시 서해구'),'2']]){
  await assert.rejects(html(region,page),/NEXT_HTTP_ERROR_FALLBACK;404/);
  await assert.rejects(route.generateMetadata(props(region,page)),/NEXT_HTTP_ERROR_FALLBACK;404/);
 }
});
