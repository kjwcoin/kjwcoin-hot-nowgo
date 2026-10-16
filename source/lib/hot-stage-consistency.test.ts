import assert from 'node:assert/strict';
import {test} from 'node:test';
import {HEAT} from './menus.ts';
import {ownerTasteMax,validOwnerTaste} from './owner-taste-level.ts';
import {isSpiceLevel} from './hot-spice.ts';

// Owner-declared HOT taste and visitor ratings both use 1..7, with independent stored values.
test('HOT owner and visitor have consistent 1-7 input bounds',()=>{
 assert.equal(HEAT.length,7,'Seven stage labels are required.');
 assert.equal(HEAT[6],'극강의 매운맛');
 assert.equal(ownerTasteMax('hot'),7);
 assert.equal(validOwnerTaste('hot',7),true);
 assert.equal(validOwnerTaste('hot',8),false);
 assert.equal(isSpiceLevel(7),true);
 assert.equal(isSpiceLevel(8),false);
});
