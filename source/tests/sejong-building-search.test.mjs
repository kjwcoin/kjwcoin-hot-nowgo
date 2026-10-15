import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sourcedStoreMatches,mapStoreGroups} from '../lib/map-sourced-stores.ts';
import {sourcedStoreSearchAliases} from '../lib/source-search-aliases.ts';
import {positionedStoreGroups,clusterStorePoints} from '../lib/map-store-clusters.ts';
const records=['hot-sejong-next47-source-records.json','hot-sejong-next38-source-records.json'].flatMap(file=>JSON.parse(fs.readFileSync(new URL('../data/'+file,import.meta.url)))).filter(row=>row.address.includes('가름로 232'));
const stores=records.map(row=>({id:row.id,sourceRef:row.source_ref,name:row.name,address:row.address,coordinates:{lat:row.lat,lon:row.lon},menus:row.source_metadata.menus}));
const match=(store,query)=>sourcedStoreMatches(store,{query,heat:0,flavor:'전체',category:'전체',budget:0});
test('both verified building spellings, spacing and plain address keep exactly three independent sources',()=>{
 assert.equal(stores.length,3);const before=JSON.stringify(stores);
 for(const query of ['세종비즈니스센터','세종비지니스센터','세종 비즈니스 센터','세종 비지니스센터','  세종  비즈니스센터  ','가름로 232','가름로232','']){
  const matches=stores.filter(store=>match(store,query));assert.equal(matches.length,3,query);
  const displays=clusterStorePoints(positionedStoreGroups(mapStoreGroups([],matches)),{level:4,bounds:null,project:()=>({x:100,y:100})});
  assert.equal(displays.length,1);assert.equal(displays[0].kind,'overlap');assert.equal(displays[0].count,3);assert.equal(new Set(displays[0].members.map(point=>point.group.source.id)).size,3);
 }
 assert.equal(JSON.stringify(stores),before);
});
test('building aliases require exact ID, source reference and unchanged full address; unrelated buildings never inherit aliases',()=>{
 for(const store of stores)for(const changed of [{...store,id:'unrelated-id'},{...store,sourceRef:'unrelated-ref'},{...store,address:store.address.replace('232','233')},{...store,address:'서울특별시 중구 다른로 232 세종비즈니스센터'}])assert.deepEqual(sourcedStoreSearchAliases(changed),[]);
 const unrelated={...stores[0],id:'unrelated-id',sourceRef:'unrelated-ref',name:'다른 건물',address:'세종특별자치시 한누리대로 311'};
 assert.equal(match(unrelated,'세종비즈니스센터'),false);assert.equal(match(unrelated,'세종비지니스센터'),false);
});
