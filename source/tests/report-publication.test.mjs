import test from 'node:test';
import assert from 'node:assert/strict';
import {retrySavedReport,publishReport,koreanToday} from '../lib/report-publication.ts';
function fixture({initial=null,uploadError=null,lostReply=false,failedPublish=false,race=false}={}){
 let row=initial,uploads=0,inserts=0;
 return {get counts(){return {uploads,inserts}},steps:{
  find:async()=>row,
  insert:async()=>{inserts++;row={id:'report',status:'draft'};return race?{code:'23505'}:null},
  upload:async()=>{uploads++;return uploadError},
  publish:async()=>{if(!failedPublish)row={id:'report',status:'published_unverified'};return {status:row.status,error:lostReply||failedPublish?{message:'timeout'}:null}},
 }};
}
test('successful submission has a persisted published receipt',async()=>{const f=fixture();assert.equal((await publishReport(f.steps)).status,'published_unverified');assert.deepEqual(f.counts,{uploads:1,inserts:1})});
test('published retry does not reupload or insert',async()=>{const f=fixture({initial:{id:'report',status:'published_unverified'}});await publishReport(f.steps);assert.deepEqual(f.counts,{uploads:0,inserts:0})});
test('draft retry resumes an existing immutable upload',async()=>{const f=fixture({initial:{id:'report',status:'draft'},uploadError:{statusCode:'409',message:'The resource already exists'}});assert.equal((await publishReport(f.steps)).status,'published_unverified');assert.equal(f.counts.inserts,0)});
test('concurrent insert race resumes same report',async()=>{const f=fixture({race:true});assert.equal((await publishReport(f.steps)).status,'published_unverified')});
test('lost publish response uses persisted success',async()=>{const f=fixture({lostReply:true});assert.equal((await publishReport(f.steps)).status,'published_unverified')});
test('a real publication failure never returns draft as success',async()=>{const f=fixture({failedPublish:true});await assert.rejects(publishReport(f.steps));assert.equal((await f.steps.find()).status,'draft')});
test('an upload permission failure is not treated as an existing image',async()=>{const f=fixture({uploadError:{statusCode:'400',message:'Permission denied'}});await assert.rejects(publishReport(f.steps))});
test('Korean today rolls over at 15:00 UTC',()=>{assert.equal(koreanToday(new Date('2026-09-29T15:01:00Z')),'2026-09-30')});

test('saved draft retry publishes without another upload',async()=>{
 let row={id:'mine',status:'draft'},calls=0;
 const receipt=await retrySavedReport({find:async()=>row,publish:async()=>{calls++;row={...row,status:'published_unverified'};return {status:row.status,error:null}}});
 assert.equal(receipt.status,'published_unverified');assert.equal(calls,1);
});
test('missing or inaccessible draft never invokes publication',async()=>{
 let calls=0;await assert.rejects(retrySavedReport({find:async()=>null,publish:async()=>{calls++;return {status:null,error:null}}}),/저장된 제보/);assert.equal(calls,0);
});
test('already published saved report retry is idempotent',async()=>{
 let calls=0;const row={id:'mine',status:'published_unverified'};
 assert.deepEqual(await retrySavedReport({find:async()=>row,publish:async()=>{calls++;return {status:null,error:null}}}),row);assert.equal(calls,0);
});
