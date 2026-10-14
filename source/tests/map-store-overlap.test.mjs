import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {overlapAddressLabel,overlapPetalOffsets,OVERLAP_PETAL_LIMIT} from '../lib/map-store-overlap.ts';
import {clusterStorePoints,positionedStoreGroups} from '../lib/map-store-clusters.ts';
import {mapStoreGroups} from '../lib/map-sourced-stores.ts';
import {sourceStore} from './fixtures/sourced-stores.mjs';
const points=stores=>positionedStoreGroups(mapStoreGroups([],stores));
const bounds={south:33,north:39.6,west:124,east:132};
test('released Sejong Business Center preserves three exact IDs, address units, coordinates and menus',()=>{
 const names=['hot-sejong-next47-source-records.json','hot-sejong-next38-source-records.json'];
 const records=names.flatMap(name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url),'utf8'))).filter(row=>row.address.includes('가름로 232'));
 assert.equal(records.length,3);assert.equal(new Set(records.map(row=>row.id)).size,3);
 const sources=records.map((row,i)=>sourceStore(i+1,{id:row.id,address:row.address,name:row.name,coordinates:{lat:row.lat,lon:row.lon}}));
 const before=JSON.stringify(sources),p=points(sources),display=clusterStorePoints(p,{bounds,level:1,project:()=>({x:100,y:100})});
 assert.equal(display.length,1);assert.equal(display[0].kind,'overlap');assert.equal(display[0].count,3);
 assert.equal(overlapAddressLabel(p),'같은 도로명 주소의 매장');assert.equal(display[0].lat,36.495780926562);assert.equal(display[0].lng,127.26539978113);
 assert.equal(JSON.stringify(sources),before);assert.ok(sources.some(s=>s.address.includes('B동 1층 116호')));assert.ok(sources.some(s=>s.address.includes('A동 207호')));
});
test('screen proximity never claims building identity, including missing or partial addresses',()=>{
 for(const addresses of [['서울특별시 중구 자료길 1','서울특별시 중구 자료길 2'],['',''],['자료길 1','자료길 11']])assert.equal(overlapAddressLabel(points(addresses.map((address,i)=>sourceStore(i+1,{address})))),'화면에서 겹치는 매장');
 const p=points([sourceStore(1),sourceStore(2)]);const near=clusterStorePoints(p,{bounds,level:4,project:()=>({x:100,y:100})});assert.equal(near[0].kind,'overlap');
 assert.equal(clusterStorePoints(p,{bounds,level:4,project:point=>({x:point.lat*100000,y:0})}).length,2);
});
test('petals are deterministic bounded screen pixels and large groups choose a list',()=>{
 for(let count=2;count<=OVERLAP_PETAL_LIMIT;count++){const offsets=overlapPetalOffsets(count);assert.equal(offsets.length,count);assert.deepEqual(offsets,overlapPetalOffsets(count));for(const p of offsets)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=170&&Math.abs(p.y)<=170)}
 for(const count of [0,1,7,100,NaN,Infinity,2.5])assert.deepEqual(overlapPetalOffsets(count),[]);
 const triangle=overlapPetalOffsets(3);assert.ok(triangle[0].y<0&&triangle[1].x>0&&triangle[2].x<0);
});
