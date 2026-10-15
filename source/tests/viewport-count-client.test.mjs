import test from 'node:test';
import assert from 'node:assert/strict';
import {readViewportBounds,validViewportCount} from '../lib/viewport-count-client.ts';
const bounds=(south,north,west,east)=>({getSouthWest:()=>({getLat:()=>south,getLng:()=>west}),getNorthEast:()=>({getLat:()=>north,getLng:()=>east})});
test('reads changed bounds after pan and zoom without truncating coordinates',()=>{assert.deepEqual(readViewportBounds(bounds(35.1,35.3,129.0,129.2)),{south:35.1,north:35.3,west:129,east:129.2});assert.deepEqual(readViewportBounds(bounds(33,39.6,124,132)),{south:33,north:39.6,west:124,east:132})});
test('invalid SDK state never becomes an empty-map count',()=>{for(const value of [null,{},bounds(NaN,39,124,132),bounds(39,33,124,132),bounds(33,39,132,124),bounds(-91,39,124,132)])assert.equal(readViewportBounds(value),null)});
test('accepts true zero and distinguishes incomplete counts',()=>{assert.deepEqual(validViewportCount({count:0,complete:true}),{count:0,complete:true});assert.deepEqual(validViewportCount({count:12,complete:false}),{count:12,complete:false})});
test('unknown and malformed response is not silently shown as zero',()=>{for(const value of [null,{}, {count:'0',complete:true},{count:NaN,complete:true},{count:-1,complete:true},{count:1.5,complete:true},{count:10}])assert.equal(validViewportCount(value),null)});

import {createViewportCounter} from '../lib/viewport-count-client.ts';
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
function harness(){
 let id=0,current=bounds(35,36,128,130);const timers=new Map(),requests=[],states=[];
 const counter=createViewportCounter({getBounds:()=>current,query:'q=칼국수&heat=0',onState:state=>states.push(state),schedule:(fn,ms)=>{timers.set(++id,{fn,ms});return id},cancel:key=>timers.delete(key),request:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}))});
 return {counter,states,requests,timers,setBounds:value=>current=value,runDelay(){const found=[...timers].find(([,v])=>v.ms===250);assert.ok(found);timers.delete(found[0]);found[1].fn()}};
}
test('pan/zoom bursts are debounced and only latest viewport requested',async()=>{const h=harness();h.counter.refresh();h.counter.refresh();h.setBounds(bounds(35.2,35.3,129.1,129.2));h.counter.refresh();assert.equal(h.requests.length,0);h.runDelay();assert.equal(h.requests.length,1);assert.match(h.requests[0].url,/south=35.2/);assert.match(h.requests[0].url,/q=/);h.requests[0].resolve({ok:true,json:async()=>({count:3,complete:true})});await flush();assert.deepEqual(h.states.at(-1),{status:'ready',count:3,complete:true});h.counter.dispose()});
test('stale response cannot replace a newer viewport count',async()=>{const h=harness();h.counter.refresh();h.runDelay();h.counter.refresh();assert.equal(h.requests[0].options.signal.aborted,true);h.runDelay();h.requests[1].resolve({ok:true,json:async()=>({count:1,complete:true})});await flush();h.requests[0].resolve({ok:true,json:async()=>({count:99,complete:true})});await flush();assert.equal(h.states.at(-1).count,1);h.counter.dispose()});
test('failed request does not become zero and a subsequent refresh recovers',async()=>{const h=harness();h.counter.refresh();h.runDelay();h.requests[0].resolve({ok:false});await flush();assert.deepEqual(h.states.at(-1),{status:'error'});h.counter.refresh();h.runDelay();h.requests[1].resolve({ok:true,json:async()=>({count:0,complete:true})});await flush();assert.deepEqual(h.states.at(-1),{status:'ready',count:0,complete:true});h.counter.dispose()});
test('dispose aborts work and removes timers without late callbacks',async()=>{const h=harness();h.counter.refresh();h.runDelay();h.counter.dispose();assert.equal(h.requests[0].options.signal.aborted,true);assert.equal(h.timers.size,0);const before=h.states.length;h.requests[0].resolve({ok:true,json:async()=>({count:3,complete:true})});await flush();h.counter.refresh();assert.equal(h.states.length,before)});
