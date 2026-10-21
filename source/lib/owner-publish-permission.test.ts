import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isExplicitOwnerGrant,requiresHotOwnerSubscription} from './owner-publish-permission.ts';

test('owner mutation requires an explicit true grant from database RPC',()=>{
 assert.equal(isExplicitOwnerGrant(true),true);
 for(const response of [false,null,undefined,0,1,'true','false',{allowed:true},{data:true},[],[true]]){
  assert.equal(isExplicitOwnerGrant(response),false);
 }
});

test('only HOT owner reports require paid owner subscription',()=>{
 assert.equal(requiresHotOwnerSubscription('hot','owner'),true);
 for(const [planet,role] of [['hot','customer'],['hot','guest'],['sweet','owner'],['rich','owner'],['HOT','owner'],['hot','OWNER'],[null,'owner'],['hot',null]]){
  assert.equal(requiresHotOwnerSubscription(planet,role),false);
 }
});
