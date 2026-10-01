import test from 'node:test';
import assert from 'node:assert/strict';
import {businessDate, currentOverride, ownerTrustLevel, parseOwnerCommand} from '../lib/owner-operations.ts';
const id='9de799ef-88c3-425a-a764-ec9f085f31d8';
const command={storeId:id,requestId:id,kind:'open_status',value:'open',active:true,expiryMode:'business_day'};
test('commands reject invented states, invalid IDs, durations and fake boolean values',()=>{
  assert.ok(parseOwnerCommand(command));
  for(const change of [{value:'invented'},{kind:'soldout'},{storeId:'another-store'},{requestId:'replay'},{expiryMode:'forever'},{active:'true'}])assert.equal(parseOwnerCommand({...command,...change}),null);
  assert.ok(parseOwnerCommand({...command,kind:'congestion',value:'full'}));
});
test('daily confirmation changes at 04:00 Korea time',()=>{
  assert.equal(businessDate('2026-10-01T18:59:59Z'),'2026-10-01');
  assert.equal(businessDate('2026-10-01T19:00:00Z'),'2026-10-02');
});
test('expired and future status cannot remain selected',()=>{
  const now=Date.parse('2026-10-01T12:00:00Z');
  const row={kind:'open_status',value:'open',setAt:'2026-10-01T11:00:00Z',expiresAt:'2026-10-01T13:00:00Z'};
  assert.equal(currentOverride([row],'open_status',now),row);
  assert.equal(currentOverride([{...row,expiresAt:'2026-10-01T12:00:00Z'}],'open_status',now),null);
  assert.equal(currentOverride([{...row,setAt:'2026-10-01T12:01:00Z'}],'open_status',now),null);
});
test('trust levels use actual penalty boundaries and suspend only at 30',()=>{
  for(const [penalty,level] of [[0,5],[5,5],[6,4],[12,3],[18,2],[24,1],[30,1]])assert.equal(ownerTrustLevel(penalty).level,level);
  assert.equal(ownerTrustLevel(29).suspended,false);assert.equal(ownerTrustLevel(30).suspended,true);
});
