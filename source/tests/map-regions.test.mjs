import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRegions,regionForAddress,readAllRegionRows,mapScopeParameters} from '../lib/map-regions.ts';
test('nationwide and regional queries never inherit the GPS radius',()=>{
 const location={lat:37.5,lng:127};
 assert.deepEqual(mapScopeParameters('national','seoul',location,15),{});
 assert.deepEqual(mapScopeParameters('regional','busan',location,15),{region:'busan'});
 assert.deepEqual(mapScopeParameters('nearby','busan',location,15),{lat:'37.5',lng:'127',radiusKm:'15'});
 assert.deepEqual(mapScopeParameters('nearby','',null,15),{});
});
test('nationwide counts unique stores, not menus, duplicate reports or demo stores',()=>{
 const result=summarizeRegions([
  {id:'a',shop:'HDD',address:'서울 성동구 성수이로7길 46'},
  {id:'b',shop:'Hdd',address:'서울 성동구 성수이로7길 46'},
  {id:'c',shop:'HDD',address:'부산 해운대구 해운대로 1'},
  {id:'d',shop:'나우고 카페',address:'인천 서구 청라'},
 ]);
 assert.equal(result.total,2);
 assert.equal(result.regions.find(x=>x.name==='서울').count,1);
 assert.equal(result.regions.find(x=>x.name==='부산').count,1);
 assert.equal(result.regions.find(x=>x.name==='인천').count,0);
 assert.equal(result.regions.length,17);
});
test('province aliases and missing region are handled honestly',()=>{
 assert.equal(regionForAddress('강원특별자치도 춘천시').id,'gangwon');
 assert.equal(regionForAddress('전북특별자치도 전주시').id,'jeonbuk');
 assert.equal(regionForAddress('충청북도 청주시').id,'chungbuk');
 const result=summarizeRegions([{id:'x',shop:'지역 미확인 가게',address:''}]);
 assert.equal(result.unassigned,1);assert.equal(result.total,1);
});
test('nationwide summary scans beyond the first 100 rows',async()=>{
 const source=Array.from({length:205},(_,i)=>({id:String(i),shop:'가게'+i,address:'서울 강남구 주소'+i}));
 const offsets=[];
 const rows=await readAllRegionRows(async(offset,size)=>{offsets.push(offset);return source.slice(offset,offset+size)});
 assert.deepEqual(offsets,[0,100,200]);assert.equal(summarizeRegions(rows).total,205);
});
test('a failed page never returns a partial count',async()=>{
 await assert.rejects(readAllRegionRows(async(offset,size)=>{
  if(offset)throw Error('database unavailable');
  return Array.from({length:size},(_,i)=>({id:String(i),shop:'가게'+i,address:'서울'}));
 }));
});

