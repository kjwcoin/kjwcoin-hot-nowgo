import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../components/hot-app.tsx',import.meta.url),'utf8');
const start=source.indexOf('async function submit('),end=source.indexOf('async function showPrivatePhoto',start);
const script=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness({point={address:'인천광역시 서구 청라한내로 72',lat:37.53,lng:126.63},essential='yes',customerReady=false,consentRequired=true,failRetry=false}={}){
 const requests=[],messages=[],publications=[],data=new Map([['essential',essential]]),noop=()=>{};
 const context={File,prepareReportPhoto:async photo=>photo,setCoordinateSearch:noop,reportLocationRequest:{current:0},setReportLocationState:noop,pending:'',submitting:{current:false},customerReady,embeddedRole:'customer',role:'customer',membership:{consentRequired,refresh:async()=>requests.push('refresh')},ownedStores:[],storeId:'',manualStore:true,point,selectedStore:null,requestId:{current:'report-id'},reportMenu:'',variant:'hot',theme:{consent:'current'},setResult:x=>messages.push(x),setPending:noop,FormData:class{set(k,v){data.set(k,v)}get(k){return data.get(k)}},setPublishedId:id=>publications.push(id),api:async(path)=>{requests.push(path);if(path==='/api/report-retry'){if(failRetry)throw new Error('photo required');return{id:'receipt',status:'published_unverified'}};if(path==='/api/reports')return{id:'receipt',status:'published_unverified'};if(path==='/api/state')return{reports:[]};return{}},window:{dispatchEvent:noop},Event:class{},postAppEvent:noop,uuid:()=> 'next',loadCatalog:async()=>{},form:{current:{reset:noop}},document:{getElementById:()=>({scrollIntoView:noop})},setToast:noop,setReports:noop,setPhotoName:noop,setPoint:noop,setAddressText:noop,setAddressSearch:noop,setReportMenu:noop,setSelectedStore:noop,setManualStore:noop,setRole:noop};
 vm.createContext(context);vm.runInContext(script,context);
 return{requests,messages,publications,retry:()=>context.retryReport('report-id'),run:()=>context.submit({preventDefault:noop,currentTarget:{}})};
}
test('new consent is recorded before publishing',async()=>{const h=harness();await h.run();assert.deepEqual(h.requests.slice(0,3),['/api/customer/consents','refresh','/api/reports'])});
test('unchecked essential consent blocks writes',async()=>{const h=harness({essential:null});await h.run();assert.equal(h.requests.length,0);assert.match(h.messages.at(-1),/필수 이용 동의/)});
test('missing store location blocks writes',async()=>{const h=harness({point:null});await h.run();assert.equal(h.requests.length,0);assert.match(h.messages.at(-1),/매장 위치/)});
test('existing consent preferences stay intact',async()=>{const h=harness({customerReady:true,consentRequired:false});await h.run();assert.equal(h.requests[0],'/api/reports');assert.ok(!h.requests.includes('/api/customer/consents'))});

test('confirmed publication exposes map receipt and refreshes saved reports',async()=>{const h=harness();await h.run();assert.deepEqual(h.publications,['receipt']);assert.ok(h.requests.includes('/api/state'));assert.doesNotMatch(h.messages.at(-1),/not defined/)});
test('saved retry needs no new form fields or photo',async()=>{const h=harness({point:null,essential:null,customerReady:true,consentRequired:false});await h.retry();assert.deepEqual(h.requests,['/api/report-retry']);assert.deepEqual(h.publications,['receipt']);assert.match(h.messages.at(-1),/접수됐어요/)});
test('failed retry never exposes a map receipt',async()=>{const h=harness({failRetry:true});await h.retry();assert.deepEqual(h.publications,[]);assert.equal(h.messages.at(-1),'photo required')});
