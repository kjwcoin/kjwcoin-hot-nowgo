import test from 'node:test';
import assert from 'node:assert/strict';
import {MENUS,RICH_MENUS,SWEET_MENUS} from '../lib/menus.ts';
import {demoLandCandidates} from '../lib/nearby-demo.ts';
import {mapMenuCatalog} from '../lib/map-menu-catalog.ts';
const origin={lat:37.532,lng:126.652};

for(const [variant,menus] of [['HOT',MENUS],['RICH',RICH_MENUS],['SWEET',SWEET_MENUS]]){
 test(`${variant}: three preview cards before GPS and during address-service failure`,()=>{
  for(const point of [null,origin]){
   const result=mapMenuCatalog(menus,point);
   assert.equal(result.length,3);
   assert.deepEqual(result.map(m=>[m.name,m.price,m.image]),menus.map(m=>[m.name,m.price,m.image]));
   assert.ok(result.every(m=>m.isDemo&&m.lat===null&&m.lng===null));
  }
 });
 test(`${variant}: one verified parcel keeps three cards but produces only one pin`,()=>{
  const result=mapMenuCatalog(menus,origin,demoLandCandidates(origin).slice(0,1));
  assert.equal(result.length,3);assert.equal(result.filter(m=>m.lat!==null).length,1);
 });
 test(`${variant}: three verified parcels produce three pins without changing catalog`,()=>{
  const before=JSON.stringify(menus),points=demoLandCandidates(origin).slice(0,3);
  const result=mapMenuCatalog(menus,origin,points);
  assert.equal(result.length,3);assert.deepEqual(result.map(m=>({lat:m.lat,lng:m.lng})),points);assert.equal(JSON.stringify(menus),before);
 });
}
test('real stores retain their coordinates and distance filter; duplicate demos are not counted',()=>{
 const real={...MENUS[0],isDemo:false,id:'real',placeId:'real',lat:origin.lat,lng:origin.lng};
 const far={...real,id:'far',placeId:'far',lat:35.1796,lng:129.0756};
 const result=mapMenuCatalog([...MENUS,...MENUS,real,far],origin);
 assert.equal(result.length,4);assert.strictEqual(result.at(-1),real);
 assert.equal(mapMenuCatalog([...MENUS,real],null).length,4);
 assert.strictEqual(mapMenuCatalog([...MENUS,real],null).at(-1),real);
 assert.equal(mapMenuCatalog([...MENUS,{...real,lat:null}],null).length,3);
});
