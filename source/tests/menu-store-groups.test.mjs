import test from 'node:test';
import assert from 'node:assert/strict';
import {menuStoreGroups,hasVerifiedOwner,storeIdentity,storePinMenu} from '../lib/menu-store-groups.ts';
const report={id:'report-a',placeId:'reported-a',shop:'진짜 식당',area:'서울특별시 중구 길 12',name:'매운 닭발',price:12000,heat:3,flavor:'칼칼한',category:'닭발',image:'/photo',lat:37.56,lng:126.97,isDemo:false,description:'회원 제보',verifiedOwner:false,ownerRegistered:false};

test('same shop and exact address produces one pin and retains original reports',()=>{
 const second={...report,id:'report-b',placeId:'reported-b',shop:' 진짜식당 ',area:'서울특별시  중구길12'};
 const input=Object.freeze([Object.freeze({...report}),Object.freeze(second)]);
 const groups=menuStoreGroups(input);
 assert.equal(groups.length,1);assert.equal(groups[0].menus.length,2);assert.equal(groups[0].reportCount,2);
 assert.strictEqual(groups[0].menus[0],input[0]);assert.strictEqual(groups[0].menus[1],input[1]);
 assert.equal(hasVerifiedOwner(storePinMenu(groups[0])),false);
});
test('same name at different addresses and missing addresses never collapse',()=>{
 const rows=[report,{...report,id:'b',placeId:'reported-b',area:'부산광역시 중구 길 12'},{...report,id:'c',placeId:'reported-c',area:''},{...report,id:'d',placeId:'reported-d',area:''}];
 assert.equal(menuStoreGroups(rows).length,4);
 assert.equal(storeIdentity('식당',''),null);
});
test('provider IDs and legacy reported IDs still deduplicate an exact shop/address',()=>{
 assert.equal(menuStoreGroups([report,{...report,id:'b',placeId:'naver-123'},{...report,id:'c',placeId:'kakao-456'}]).length,1);
});
test('repeated pages count each original report once and respect server totals',()=>{
 const rows=[report,report,{...report,id:'b',reportCount:8},{...report,id:'c',reportCount:2}];
 const group=menuStoreGroups(rows)[0];assert.equal(group.menus.length,3);assert.equal(group.reportCount,8);
 assert.equal(menuStoreGroups([report,{...report,id:'b',reportCount:0}])[0].reportCount,2);
 assert.equal(menuStoreGroups([{...report,reportCount:Infinity}])[0].reportCount,1);
});
test('registration or an owner ID alone cannot color an unverified pin',()=>{
 for(const candidate of [{...report,ownerRegistered:true},{...report,ownerStoreId:'store-a'},{...report,ownerRegistered:true,ownerStoreId:'store-a'}]){
  assert.equal(hasVerifiedOwner(candidate),false);
  assert.equal(menuStoreGroups([candidate])[0].ownerRegistered,false);
 }
});
test('approved owner claim colors the store while preserving consumer attribution and counts',()=>{
 const claimed={...report,ownerClaimVerified:true,ownerStoreId:'store-a',ownerRegistered:true};
 const group=menuStoreGroups([claimed,{...report,id:'b'}])[0];
 assert.equal(group.ownerRegistered,true);assert.equal(group.reportCount,2);assert.equal(group.placeId,'nowgo-store-a');
 const selected=storePinMenu(group,'b');assert.equal(selected.id,'b');assert.equal(selected.verifiedOwner,false);assert.equal(selected.ownerClaimVerified,true);
 assert.equal(group.menus.find(menu=>menu.id==='b').ownerClaimVerified,undefined);
});
test('owner menu and consumer reports share one pin without replacing originals',()=>{
 const owner={...report,id:'owner-menu',placeId:'nowgo-store-a',ownerStoreId:'store-a',verifiedOwner:true};
 const groups=menuStoreGroups([report,owner,{...report,id:'b'}]);
 assert.equal(groups.length,1);assert.deepEqual(groups[0].menus.map(m=>m.id),['owner-menu','report-a','b']);assert.equal(groups[0].reportCount,2);
 assert.equal(storePinMenu(groups[0],'report-a').id,'report-a');
});
test('conflicting authoritative store IDs are not merged through a text-only report',()=>{
 const a={...report,id:'a',ownerStoreId:'store-a',verifiedOwner:true},b={...a,id:'b',ownerStoreId:'store-b'};
 const groups=menuStoreGroups([a,report,b]);assert.equal(groups.length,3);
 assert.equal(groups.find(group=>group.menus[0].id===report.id).ownerRegistered,false);
});
test('claim revocation on refreshed data returns the pin to gray',()=>{
 const verified={...report,ownerClaimVerified:true,ownerRegistered:true};
 assert.equal(menuStoreGroups([verified])[0].ownerRegistered,true);
 assert.equal(menuStoreGroups([verified,report])[0].ownerRegistered,false);
});
test('different legacy server count scopes add up while a partial catalogue stays a known minimum',()=>{
 const a={...report,reportCount:3,reportCountScope:'shop-spaced'},b={...report,id:'b',shop:'진짜식당',reportCount:5,reportCountScope:'shop-unspaced'};
 const groups=menuStoreGroups([a,b,{...b,id:'c'}]);assert.equal(groups.length,1);assert.equal(groups[0].reportCount,8);assert.equal(groups[0].reportCountIsMinimum,true);
 assert.equal(menuStoreGroups([a])[0].reportCount,3);assert.equal(menuStoreGroups([a])[0].reportCountIsMinimum,true);
});
test('unknown count scopes never get added as if they were known disjoint totals',()=>{const group=menuStoreGroups([{...report,reportCount:4},{...report,id:'b',reportCount:4}])[0];assert.equal(group.reportCount,4);assert.equal(group.reportCountIsMinimum,true)});
