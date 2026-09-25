import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';

const port=Number(process.env.ECOSYSTEM_SMOKE_PORT||3127);
const server=spawn('pnpm',['start','--hostname','127.0.0.1','--port',String(port)],{
 cwd:new URL('..',import.meta.url).pathname,
 detached:true,
 stdio:'ignore'
});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function request(host,path,method='GET'){
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path,method,headers:{Host:host}},res=>{
   let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);
   res.on('end',()=>resolve({status:res.statusCode,body}));
  });
  req.on('error',reject);req.end();
 });
}
async function ready(){
 for(let i=0;i<50;i++){
  try{const response=await request('hot.nowgo.space','/');if(response.status===200)return}catch{}
  await delay(100);
 }
 throw new Error('Local production server did not start');
}
try{
 await ready();
 for(const [key,own,others] of [
  ['hot','달콤매콤 떡볶이',['꾸덕 크림 파스타','민트 크림 케이크']],
  ['rich','꾸덕 크림 파스타',['달콤매콤 떡볶이','민트 크림 케이크']],
  ['sweet','민트 크림 케이크',['달콤매콤 떡볶이','꾸덕 크림 파스타']]
 ]){
  const host=`${key}.nowgo.space`;
  for(const path of ['/','/suggestion']){
   const {status,body}=await request(host,path);
   assert.equal(status,200,`${host}${path}`);
   assert.ok(body.includes(own),`${host}${path}: expected menu`);
   for(const other of others)assert.ok(!body.includes(other),`${host}${path}: cross-theme menu`);
   assert.ok(body.includes('가매장'),`${host}${path}: demo disclosure`);
  }
  const anonymous=await request(host,'/api/customer/me');
  assert.equal(anonymous.status,200,`${host} anonymous account`);
  assert.equal(JSON.parse(anonymous.body).customer,null);
  const denied=await request(host,'/api/state','POST');
  assert.equal(denied.status,401,`${host} anonymous write`);
  const ownId=key==='hot'?'demo-menu-01':`demo-${key}-menu-01`;
  const ownMenu=await request(host,`/api/menu?id=${ownId}`);
  assert.equal(ownMenu.status,200);
  assert.equal(JSON.parse(ownMenu.body).menu?.id,ownId,ownMenu.body.slice(0,400));
  const otherKey=key==='hot'?'rich':'hot';
  const otherId=otherKey==='hot'?'demo-menu-01':`demo-${otherKey}-menu-01`;
  const otherMenu=await request(host,`/api/menu?id=${otherId}`);
  assert.equal(JSON.parse(otherMenu.body).menu,null,`${host} cross-theme lookup`);
  const outOfRange=await request(host,'/api/menus?page=101');
  assert.deepEqual(JSON.parse(outOfRange.body),{menus:[],hasMore:false});
 }
 assert.equal((await request('hot.nowgo.space','/place/demo-rich-place-01')).status,404);
 assert.equal((await request('rich.nowgo.space','/place/demo-rich-place-01')).status,200);
 assert.equal((await request('sweet.nowgo.space','/place/demo-rich-place-01')).status,404);
 console.log('PASS: 3 host profiles, suggestion pages, anonymous write denial, cross-theme place isolation');
}finally{
 try{process.kill(-server.pid,'SIGTERM')}catch{}
}
