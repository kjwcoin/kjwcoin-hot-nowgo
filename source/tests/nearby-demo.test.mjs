import test from 'node:test';
import assert from 'node:assert/strict';
import {demoLandCandidates,distanceKm,hasVerifiedLandParcel,MAP_RADIUS_KM,menusWithinRadius,NEIGHBORHOOD_LEVEL} from '../lib/nearby-demo.ts';
const origin={lat:37.5326,lng:126.6384};
const demo=(id)=>({id,placeId:id,isDemo:true,lat:37.5,lng:126.6});
test('reverse geocoding must prove a numbered Korean parcel',()=>{
 assert.equal(hasVerifiedLandParcel({address_name:'인천광역시 서구 청라동 1',main_address_no:'1',region_1depth_name:'인천광역시'}),true);
 for(const address of [null,{}, {address_name:'바다',region_1depth_name:'인천광역시'},{address_name:'서울',main_address_no:'-',region_1depth_name:'서울특별시'}])assert.equal(hasVerifiedLandParcel(address),false);
});
test('fixed neighborhood settings and candidate radius',()=>{
 assert.equal(MAP_RADIUS_KM,15);
 assert.equal(NEIGHBORHOOD_LEVEL,5);
 assert.equal(demoLandCandidates(origin).length,64);
 assert.ok(demoLandCandidates(origin).every(point=>distanceKm(origin,point)<15));
});
test('never show fake shops without location or verified land, and keep real stores within 15km',()=>{
 const catalog=[demo('one'),demo('two'),demo('three'),{...demo('real'),isDemo:false,lat:origin.lat,lng:origin.lng},{...demo('far'),isDemo:false,lat:37.8,lng:126.6}];
 assert.deepEqual(menusWithinRadius(catalog,null,[]),[]);
 assert.deepEqual(menusWithinRadius(catalog,origin,[]).map(x=>x.id),['real']);
 const land=demoLandCandidates(origin).slice(0,3),found=menusWithinRadius(catalog,origin,land);
 assert.deepEqual(found.map(x=>x.id),['one','two','three','real']);
 assert.ok(found.every(item=>distanceKm(origin,item)<=15));
});
