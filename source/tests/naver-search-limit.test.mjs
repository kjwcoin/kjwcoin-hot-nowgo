import test from 'node:test';
import assert from 'node:assert/strict';
import {allowNaverSearch} from '../lib/naver-search-limit.ts';
test('per-user limits reset without storing query/results',()=>{const now=1_000_000;for(let i=0;i<10;i++)assert.equal(allowNaverSearch('a',now),true);assert.equal(allowNaverSearch('a',now),false);assert.equal(allowNaverSearch('b',now),true);assert.equal(allowNaverSearch('a',now+60_000),true)});
test('bounded per-instance window stops bursts across users',()=>{const now=2_000_000;for(let i=0;i<100;i++)assert.equal(allowNaverSearch('user-'+i,now),true);assert.equal(allowNaverSearch('overflow',now),false);assert.equal(allowNaverSearch('overflow',now+60_000),true)});
