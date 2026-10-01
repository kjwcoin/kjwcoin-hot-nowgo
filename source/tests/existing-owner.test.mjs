import test from 'node:test';
import assert from 'node:assert/strict';
import {isExistingOwner} from '../lib/existing-owner.ts';

function client(data, error = null) {
 const calls=[];
 return {calls,from(table){calls.push(['from',table]);return {select(columns){calls.push(['select',columns]);return this},eq(column,value){calls.push(['eq',column,value]);return this},async maybeSingle(){return {data,error}}}}};
}
test('existing owner membership is queried using only the verified user ID',async()=>{
 const db=client({id:'owner-id'});
 assert.equal(await isExistingOwner(db,'owner-id'),true);
 assert.deepEqual(db.calls,[['from','owners'],['select','id'],['eq','id','owner-id']]);
});
test('a new account or another owner row does not qualify',async()=>{
 assert.equal(await isExistingOwner(client(null),'new-id'),false);
 assert.equal(await isExistingOwner(client({id:'someone-else'}),'new-id'),false);
});
test('a failed owner lookup does not silently send an existing member to signup',async()=>{
 await assert.rejects(()=>isExistingOwner(client(null,new Error('database unavailable')),'owner-id'),/database unavailable/);
});
