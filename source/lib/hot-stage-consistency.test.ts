import assert from 'node:assert/strict';
import {test} from 'node:test';
import {HEAT} from './menus.ts';
import {ownerTasteMax,validOwnerTaste} from './owner-taste-level.ts';
import {isSpiceLevel} from './hot-spice.ts';

// Merchant-declared HOT heat is 1-7; visitor ratings and their median are 1-8.
test('HOT owner 1-7 and visitor rating 1-8 are intentionally separate',()=>{
 assert.equal(HEAT.length,8,'Community HOT scale needs eight labels.');
 assert.equal(ownerTasteMax('hot'),7,'Owner menu registration stays 1..7.');
 assert.equal(validOwnerTaste('hot',7),true);
 assert.equal(validOwnerTaste('hot',8),false);
 assert.equal(isSpiceLevel(8),true);
 assert.equal(isSpiceLevel(9),false);
});
