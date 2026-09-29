import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDemoLand} from '../lib/resolve-demo-land.ts';
const origin={lat:37.532,lng:126.652};
const parcel=[{address:{address_name:'인천광역시 서구 청라동 1',main_address_no:'1',region_1depth_name:'인천광역시'}}];

test('a transient address error retries and recovers three distinct land points',async()=>{
 const attempts=new Map();
 const geocoder={coord2Address(lng,lat,callback){const key=`${lng},${lat}`,n=attempts.get(key)||0;attempts.set(key,n+1);callback(n?parcel:[],n?'OK':'ERROR')}};
 const result=await resolveDemoLand(origin,geocoder);
 assert.equal(result.state,'ready');assert.equal(result.points.length,3);
 assert.equal(new Set(result.points.map(p=>`${p.lat},${p.lng}`)).size,3);
 assert.ok([...attempts.values()].every(n=>n===2));
});
test('provider outage is an error, not an empty menu result, and requests are bounded',async()=>{
 let calls=0;
 const result=await resolveDemoLand(origin,{coord2Address(x,y,cb){calls++;cb([],'ERROR')}});
 assert.deepEqual(result,{points:[],state:'error'});assert.equal(calls,8);
});
test('a missing callback times out and remains retryable',async()=>{
 const result=await resolveDemoLand(origin,{coord2Address(){}},{timeoutMs:5});
 assert.deepEqual(result,{points:[],state:'error'});
});
test('sea and unknown parcels never fill missing sample stores',async()=>{
 const result=await resolveDemoLand(origin,{coord2Address(x,y,cb){cb([{address:{address_name:'바다'}}],'OK')}});
 assert.deepEqual(result,{points:[],state:'empty'});
});
test('foreign coordinates cannot move the map or request Korean demo locations',async()=>{
 let calls=0;
 const result=await resolveDemoLand({lat:37.7749,lng:-122.4194},{coord2Address(){calls++}});
 assert.deepEqual(result,{points:[],state:'error'});assert.equal(calls,0);
});
test('stale location requests cannot publish verified points',async()=>{
 let current=true;
 const result=await resolveDemoLand(origin,{coord2Address(x,y,cb){current=false;cb(parcel,'OK')}},{isCurrent:()=>current});
 assert.deepEqual(result,{points:[],state:'error'});
});
