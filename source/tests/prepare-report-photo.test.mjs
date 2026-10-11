import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../lib/prepare-report-photo.ts',import.meta.url),'utf8');
const script=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function harness({fails=false}={}){
 const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),toBlob(callback,type,quality){callback(new Blob([new Uint8Array(quality>.8?2_500_000:700_000)],{type}))}};
 const exports={},revoked=[];
 const context={exports,File,Blob,Error,Image:class{naturalWidth=4032;naturalHeight=3024;async decode(){if(fails)throw Error('invalid image')}},URL:{createObjectURL:()=> 'blob:photo',revokeObjectURL:url=>revoked.push(url)},document:{createElement:()=>canvas}};
 vm.runInNewContext(script,context);return{prepare:exports.prepareReportPhoto,canvas,revoked};
}
test('accepts a 12 MB original and automatically optimizes the transfer',async()=>{const h=harness(),photo=new File([new Uint8Array(12_000_000)],'phone.jpg',{type:'image/jpeg'});const result=await h.prepare(photo);assert.equal(result.type,'image/jpeg');assert.equal(result.size,700_000);assert.equal(h.canvas.width,1600);assert.equal(h.canvas.height,1200);assert.deepEqual(h.revoked,['blob:photo'])});
test('invalid image releases its object URL and reports the decode failure',async()=>{const h=harness({fails:true});await assert.rejects(h.prepare(new File(['broken'],'photo.jpg',{type:'image/jpeg'})),/invalid image/);assert.deepEqual(h.revoked,['blob:photo'])});
