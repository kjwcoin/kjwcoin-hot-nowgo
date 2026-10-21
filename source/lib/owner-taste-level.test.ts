import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ownerTasteMax,validOwnerTaste} from './owner-taste-level.ts';

test('HOT owner levels accept 1 through 7, rejecting invalid input',()=>{
 assert.equal(ownerTasteMax('hot'),7);
 for(let value=1;value<=7;value++)assert.equal(validOwnerTaste('hot',value),true);
 for(const value of [0,8,9,4.5,'7',null,NaN])assert.equal(validOwnerTaste('hot',value),false);
});

test('SWEET and RICH remain on legacy 1 through 5 scale',()=>{
 for(const planet of ['sweet','rich'] as const){
  assert.equal(ownerTasteMax(planet),5);
  assert.equal(validOwnerTaste(planet,1),true);
  assert.equal(validOwnerTaste(planet,5),true);
  assert.equal(validOwnerTaste(planet,6),false);
  assert.equal(validOwnerTaste(planet,8),false);
 }
});
