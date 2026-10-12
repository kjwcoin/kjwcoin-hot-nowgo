import test from 'node:test';
import assert from 'node:assert/strict';
import {mapMenuCatalog} from '../lib/map-menu-catalog.ts';
const origin={lat:37.543,lng:127.053};
const real={id:'real',placeId:'real',shop:'등록 가게',name:'실제 매운 메뉴',price:9000,heat:3,isDemo:false,...origin};
test('only real stores with coordinates appear; no demo pins before or after GPS',()=>{
 const demo={...real,isDemo:true,id:'demo'},missing={...real,lat:null},rows=[demo,real,missing];
 for(const point of [null,origin])assert.deepEqual(mapMenuCatalog(rows,point),[real]);
 assert.equal(rows.length,3);
});
test('15km excludes distant stores while nationwide view preserves real coordinates',()=>{
 const far={...real,id:'far',lat:35.1796,lng:129.0756};
 assert.deepEqual(mapMenuCatalog([real,far],origin),[real]);
 assert.deepEqual(mapMenuCatalog([real,far],null),[real,far]);
 assert.strictEqual(mapMenuCatalog([real],null)[0],real);
});
