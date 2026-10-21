import test from 'node:test';
import assert from 'node:assert/strict';
import {MENUS,RICH_MENUS,SWEET_MENUS} from '../lib/menus.ts';
import {demoLandCandidates} from '../lib/nearby-demo.ts';
import {mapMenuCatalog} from '../lib/map-menu-catalog.ts';
const origin={lat:37.532,lng:126.652};
for(const [variant,menus] of [['HOT',MENUS],['RICH',RICH_MENUS],['SWEET',SWEET_MENUS]]){
 test(variant+': demo menus never become public cards or pins, even on verified land',()=>{
  const before=JSON.stringify(menus);
  for(const point of [null,origin])for(const land of [[],demoLandCandidates(origin).slice(0,3)])assert.deepEqual(mapMenuCatalog(menus,point,land),[]);
  assert.equal(JSON.stringify(menus),before);
 });
}
test('real stores keep coordinates and radius filtering without synthetic pins',()=>{
 const real={...MENUS[0],isDemo:false,id:'real',placeId:'real',lat:origin.lat,lng:origin.lng};
 const far={...real,id:'far',placeId:'far',lat:35.1796,lng:129.0756};
 assert.deepEqual(mapMenuCatalog([...MENUS,...MENUS,real,far],origin),[real]);
 assert.deepEqual(mapMenuCatalog([...MENUS,real,far],null),[real,far]);
 for(const invalid of [{lat:null},{lng:null},{lat:NaN},{lng:Infinity}])assert.deepEqual(mapMenuCatalog([...MENUS,{...real,...invalid}],null),[]);
});
