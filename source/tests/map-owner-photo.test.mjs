import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
const exports={};
const source=fs.readFileSync(new URL('../lib/map-owner-api.ts',import.meta.url),'utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports,File,Request,Uint8Array,Error,require(name){if(name==='sharp')return sharp;return {reply(){}}}});
test('each menu requires an actual supported photo, bounded to 5 MB',async()=>{
 for(const photo of [null,new File([],'empty.jpg',{type:'image/jpeg'})])await assert.rejects(exports.prepareOwnerPhoto(photo),/photo_required/);
 await assert.rejects(exports.prepareOwnerPhoto(new File(['not a photo'],'fake.jpg',{type:'image/jpeg'})),/invalid_photo/);
 await assert.rejects(exports.prepareOwnerPhoto(new File(['<svg/>'],'picture.svg',{type:'image/svg+xml'})),/invalid_photo/);
 await assert.rejects(exports.prepareOwnerPhoto(new File([new Uint8Array(5*1024*1024+1)],'large.jpg',{type:'image/jpeg'})),/photo_too_large/);
});
test('photos are resized and re-encoded, without source metadata',async()=>{
 const source=await sharp({create:{width:2200,height:1200,channels:3,background:'#c93421'}}).withExif({IFD0:{Artist:'private metadata'}}).jpeg().toBuffer();
 const output=await exports.prepareOwnerPhoto(new File([source],'menu.jpg',{type:'image/jpeg'}));
 const metadata=await sharp(output).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.width,1600);assert(!metadata.exif);assert(!metadata.xmp);
});
