import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isMissingReadOnlyRpc} from './optional-readonly-rpc.ts';

test('only undefined function errors allow a safe optional read fallback',()=>{
  assert.equal(isMissingReadOnlyRpc({code:'PGRST202'}),true);
  assert.equal(isMissingReadOnlyRpc({code:'42883'}),true);
  for (const value of [{code:'42501'}, {code:'PGRST301'},{code:'PGRST116'}, {message:'PGRST202'},null,undefined,{}]){
    assert.equal(isMissingReadOnlyRpc(value),false);
  }
});
