import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mayWriteToProduction} from './production-write-guard.ts';

test('production write bridge fails closed in previews, development and unset environments',()=>{
  for(const value of [undefined,'','development','preview','test','Production']){
    assert.equal(mayWriteToProduction(value),false);
  }
  assert.equal(mayWriteToProduction('production'),true);
});
