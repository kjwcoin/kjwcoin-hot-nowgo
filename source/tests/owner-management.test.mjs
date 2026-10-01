import test from 'node:test';
import assert from 'node:assert/strict';
import {fromKoreanInput,localKoreanInput,confirmedToday,currentWaiting} from '../lib/owner-management.ts';
test('operating day resets at 04:00 KST',()=>{
 assert.equal(confirmedToday('2026-10-01T08:00:00Z','2026-10-01T18:59:59Z'),true);
 assert.equal(confirmedToday('2026-10-01T08:00:00Z','2026-10-01T19:00:00Z'),false);
 assert.equal(confirmedToday('invalid','2026-10-01T10:00:00Z'),false);
});
test('booking inputs use Korean time regardless of server/browser timezone',()=>{
 assert.equal(fromKoreanInput('2026-10-01T19:30'),'2026-10-01T10:30:00.000Z');
 assert.equal(localKoreanInput('2026-10-01T10:30:00Z'),'2026-10-01T19:30');
});
test('today waiting list excludes old dates, reservations and seated guests',()=>{
 const make=(id,kind,status,day)=>({id,kind,status,service_date:day});
 const items=[make('waiting','waiting','waiting','2026-10-01'),make('called','waiting','called','2026-10-01'),make('old','waiting','waiting','2026-09-30'),make('seated','waiting','seated','2026-10-01'),make('reservation','reservation','confirmed','2026-10-01')];
 assert.deepEqual(currentWaiting(items,'2026-10-01T10:00:00Z').map(x=>x.id),['waiting','called']);
});

// Owner entry points must remain inside each map site.
test("owner entry points never send owners to the Space SaaS", async () => {
 const {readFile}=await import("node:fs/promises");
 for(const path of ["components/customer-panel.tsx","components/hot-app.tsx","components/report-access.tsx","app/account/join/page.tsx","app/account/callback/page.tsx","app/place/[id]/page.tsx"]){
  const source=await readFile(new URL("../"+path,import.meta.url),"utf8");
  assert.doesNotMatch(source,/https:\/\/(?:www\.)?nowgo\.space\/owner\//);
 }
});
