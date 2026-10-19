import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizedMenuQuery,menuSearchError,menuSearchTerms,catalogMenuSearchFilter,MENU_SEARCH_MAX_CHARACTERS} from './menu-search.ts';

test('normalizes Hangul and disallows injected PostgREST operators',()=>{
 assert.equal(normalizedMenuQuery('  홍대!! 떡볶이  '),'홍대 떡볶이');
 const f=catalogMenuSearchFilter('홍대!! 떡볶이')||'';
 assert.match(f,/and\(or\(/);
 assert.ok(f.includes('홍대'));
 assert.ok(f.includes('떡볶이'));
 assert.doesNotMatch(f,/!!|;|%2C/);
});
test('search tokens are unique and bounded',()=>{
 assert.deepEqual(menuSearchTerms(' 닭발 닭발 마라 '),['닭발','마라']);
 assert.equal(menuSearchError('가'.repeat(MENU_SEARCH_MAX_CHARACTERS)),null);
 assert.ok(menuSearchError('가'.repeat(MENU_SEARCH_MAX_CHARACTERS+1)));
 assert.ok(menuSearchError('하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉'));
});
test('empty query returns no filter without inventing discovery facts',()=>{
 assert.equal(catalogMenuSearchFilter('  '),null);
 assert.equal(catalogMenuSearchFilter('...'),null);
});
