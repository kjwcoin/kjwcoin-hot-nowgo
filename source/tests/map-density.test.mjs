import test from 'node:test';
import assert from 'node:assert/strict';
import {administrativeLabel,groupDensity,densityColor,densityLevel} from '../lib/map-density.ts';
test('counts restaurants once across multiple menus and isolates the 15km radius',()=>{
 const near={shop:'HDD',address:'서울 성동구 성수이로7길 46',lat:37.543,lng:127.053};
 const rows=[near,{...near},{...near,shop:'다른 가게'},{...near,shop:'먼 가게',lat:37.8},{...near,shop:'미확인',lat:null}];
 const groups=groupDensity(rows,'district',{lat:37.544,lng:127.055});assert.equal(groups.length,1);assert.equal(groups[0].count,2);assert.equal(groups[0].label,'서울특별시 성동구');
});
test('zoom selects province, district, dong and never infers dong from road names',()=>{
 assert.equal(densityLevel(9),'region');assert.equal(densityLevel(12),'district');assert.equal(densityLevel(14),'dong');
 assert.equal(administrativeLabel('경기도 성남시 분당구 정자동 178-1','dong'),'경기도 성남시 분당구 정자동');
 assert.equal(administrativeLabel('서울 성동구 성수이로7길 46','dong'),'서울특별시 성동구 · 동 미확인');
 assert.equal(administrativeLabel('서울 성동구 성수동1가 13','dong'),'서울특별시 성동구 성수동1가');
});
test('fewer restaurants are light red; greater counts are progressively darker',()=>{
 const color=n=>densityColor(n).background.match(/\d+/g).map(Number);
 for(const [a,b] of [[1,5],[5,20],[20,100]])assert.ok(color(a)[1]>color(b)[1]);
 assert.equal(densityColor(1).color,'#68140c');assert.equal(densityColor(100).color,'#fff');
});
