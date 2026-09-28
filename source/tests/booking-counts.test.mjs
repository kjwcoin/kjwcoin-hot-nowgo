import assert from 'node:assert/strict';
import test from 'node:test';
import {liveWaitingCount,waitingCountLabel,BOOKING_REFRESH_MS} from '../lib/booking-counts.ts';

test('unknown and event-free real stores show a dash, not a synthetic zero',()=>{
 for(const value of [undefined,null,'3',-1,NaN,1.5,0])assert.equal(waitingCountLabel(value),'-');
 assert.equal(waitingCountLabel(3,false),'-');
});
test('only persisted event counts render, including measured zero after cancellation',()=>{
 assert.equal(waitingCountLabel(3,true),'3팀');
 assert.equal(waitingCountLabel(0,true),'0팀');
 assert.equal(liveWaitingCount(3),3);
 assert.equal(BOOKING_REFRESH_MS,60000);
});
