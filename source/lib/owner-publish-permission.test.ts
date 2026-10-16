import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isExplicitOwnerGrant} from './owner-publish-permission.ts';

test('owner mutation requires an explicit true grant from database RPC',()=>{
 assert.equal(isExplicitOwnerGrant(true),true);
 for(const response of [false,null,undefined,0,1,'true','false',{allowed:true},{data:true},[],[true]]){
  assert.equal(isExplicitOwnerGrant(response),false);
 }
});
