import assert from 'node:assert/strict';
import {test} from 'node:test';
import {customerSavedStateMatches} from './customer-save-readback.ts';

test('confirmed bookmark saved and removed readbacks',()=>{
  assert.equal(customerSavedStateMatches({menu_id:'menu-1'},'menu-1',true),true);
  assert.equal(customerSavedStateMatches(null,'menu-1',false),true);
});
test('rejects missing, misleading and wrong-menu write acknowledgements',()=>{
  for(const value of [null,undefined,{},[],{menu_id:'menu-2'},{menu_id:null}]){
    assert.equal(customerSavedStateMatches(value,'menu-1',true),false);
  }
  assert.equal(customerSavedStateMatches({menu_id:'menu-1'},'menu-1',false),false);
  assert.equal(customerSavedStateMatches(undefined,'menu-1',false),false);
});
