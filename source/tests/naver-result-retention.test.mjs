import test from 'node:test';
import assert from 'node:assert/strict';
import {NAVER_RESULT_LIFETIME_MS,naverResultsExpired} from '../lib/naver-result-retention.ts';
test('temporary in-tab search results expire within 24h, including resumed/background tabs',()=>{const now=10_000,expiry=now+NAVER_RESULT_LIFETIME_MS;assert.equal(NAVER_RESULT_LIFETIME_MS,86_400_000);assert.equal(naverResultsExpired(expiry,expiry-1),false);assert.equal(naverResultsExpired(expiry,expiry),true);assert.equal(naverResultsExpired(expiry,expiry+1000),true);assert.equal(naverResultsExpired(NaN,now),true)});
