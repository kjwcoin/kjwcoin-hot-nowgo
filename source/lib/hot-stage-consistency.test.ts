import assert from 'node:assert/strict';
import {test} from 'node:test';
import {HEAT} from './menus.ts';
import {ownerTasteMax} from './owner-taste-level.ts';
import {isSpiceLevel} from './hot-spice.ts';

// Intentional release gate: catch mixed HOT scales before a merge or deployment.
// Do not weaken this assertion to make the PR green. Resolve the product scale
// and development DB constraint first; SWEET/RICH remain independent.
test('HOT visible labels, owner input and community ratings share one scale',()=>{
 const ownerMaximum=ownerTasteMax('hot');
 assert.equal(HEAT.length,ownerMaximum,
  'HOT labels and owner range disagree. Confirm 7 vs 8 with product and DB first.');
 assert.equal(isSpiceLevel(ownerMaximum),true,
  'Community rating max must include the owner max.');
 assert.equal(isSpiceLevel(ownerMaximum+1),false,
  'Community rating max cannot exceed the owner max.');
});
