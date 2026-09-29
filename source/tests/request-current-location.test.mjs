import test from 'node:test';
import assert from 'node:assert/strict';
import {requestCurrentLocation} from '../lib/request-current-location.ts';

const coords={latitude:37.532,longitude:126.652,accuracy:20};
function device(responses){
 const calls=[];
 return {calls,getCurrentPosition(ok,fail,options){calls.push(options);const response=responses.shift();if(response.code)fail(response);else ok({coords:response})}};
}
test('uses a valid location without an unnecessary retry',async()=>{
 const geo=device([coords]);
 assert.deepEqual(await requestCurrentLocation(geo),{state:'located',point:{lat:coords.latitude,lng:coords.longitude}});
 assert.equal(geo.calls.length,1);
});
test('a high accuracy timeout retries the normal provider with a fresh fix',async()=>{
 const geo=device([{code:3},coords]);let retries=0;
 assert.equal((await requestCurrentLocation(geo,{onRetry:()=>retries++})).state,'located');
 assert.equal(retries,1);
 assert.deepEqual(geo.calls[1],{enableHighAccuracy:false,timeout:15000,maximumAge:0});
});
test('permission denial does not retry or bypass permission',async()=>{
 const geo=device([{code:1}]);
 assert.deepEqual(await requestCurrentLocation(geo),{state:'denied'});
 assert.equal(geo.calls.length,1);
});
for(const [code,state] of [[2,'unavailable'],[3,'timeout']])test(`reports ${state} after bounded retries`,async()=>{
 const geo=device([{code},{code}]);
 assert.deepEqual(await requestCurrentLocation(geo),{state});
 assert.equal(geo.calls.length,2);
});
test('an inaccurate cached location requires a fresh precise result',async()=>{
 const geo=device([{...coords,accuracy:6000},coords]);
 assert.equal((await requestCurrentLocation(geo)).state,'located');
 assert.equal(geo.calls[1].enableHighAccuracy,true);
 assert.equal(geo.calls[1].maximumAge,0);
});
for(const [change,state] of [[{accuracy:6000},'inaccurate'],[{accuracy:NaN},'inaccurate'],[{latitude:NaN},'inaccurate'],[{longitude:-122.4},'outside']])test(`rejects invalid location ${JSON.stringify(change)}`,async()=>{
 assert.deepEqual(await requestCurrentLocation(device([{...coords,...change},{...coords,...change}])),{state});
});
test('cancelled location results cannot trigger another request',async()=>{
 const geo=device([{code:3}]);
 assert.deepEqual(await requestCurrentLocation(geo,{isCurrent:()=>false}),{state:'cancelled'});
 assert.equal(geo.calls.length,1);
});
test('a stale fallback result is discarded',async()=>{
 let active=true;
 const geo={getCurrentPosition(ok,fail){if(active){active=false;fail({code:3})}else ok({coords})}};
 let checks=0;
 assert.deepEqual(await requestCurrentLocation(geo,{isCurrent:()=>++checks===1}),{state:'cancelled'});
});
