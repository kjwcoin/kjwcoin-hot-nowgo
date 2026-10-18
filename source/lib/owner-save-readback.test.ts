import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ownerSaveReadbackMatches} from './owner-save-readback.ts';

const storeId='12345678-1234-4234-8234-123456789abc';
const menuId='23456789-1234-4234-8234-123456789abc';
const menu={id:menuId,name:'극강 메뉴',price:8900,level:7,flavor:'칼칼한',
  category:'국물·면',photoPath:'owner/store/hot/photo.webp',soldout:false};
const snapshot={storeId,access:{enabled:true},state:{status:{value:'open'},menus:[menu]}};

test('status readback rejects missing or unauthorized store',()=>{
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'status',value:'open'}),true);
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'status',value:'temporary_closed'}),false);
  assert.equal(ownerSaveReadbackMatches({...snapshot,storeId:'other'},storeId,{action:'status',value:'open'}),false);
  assert.equal(ownerSaveReadbackMatches({...snapshot,access:{enabled:false}},storeId,{action:'status',value:'open'}),false);
  assert.equal(ownerSaveReadbackMatches({storeId,access:{enabled:true}},storeId,{action:'status',value:'open'}),false);
});

test('soldout readback checks exact menu and boolean',()=>{
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'soldout',menuId,soldout:false}),true);
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'soldout',menuId,soldout:true}),false);
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'soldout',menuId:'wrong',soldout:false}),false);
});

test('owner 7-level taste readback stays separate from visitor ratings',()=>{
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'taste',menuId,level:7,flavor:'칼칼한',category:'국물·면'}),true);
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'taste',menuId,level:6,flavor:'칼칼한',category:'국물·면'}),false);
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'taste',menuId,level:7,flavor:'얼큰한',category:'국물·면'}),false);
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{action:'taste',menuId,level:7,flavor:'칼칼한',category:'기타'}),false);
});

test('new menu readback requires matching photo and every owner-controlled field',()=>{
  const expected={action:'register' as const,menuId,name:menu.name,price:menu.price,
    level:menu.level,flavor:menu.flavor,category:menu.category,photoPath:menu.photoPath};
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,expected),true);
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{...expected,price:9000}),false);
  assert.equal(ownerSaveReadbackMatches(snapshot,storeId,{...expected,photoPath:'bad.webp'}),false);
  assert.equal(ownerSaveReadbackMatches({...snapshot,state:{status:{value:'open'},menus:[]}},storeId,expected),false);
  assert.equal(ownerSaveReadbackMatches(null,storeId,expected),false);
});

test('duplicate menu IDs are rejected for all owner menu write actions',()=>{
  // Even identical duplicate rows make the write acknowledgement ambiguous.
  const duplicate={...snapshot,state:{...snapshot.state,menus:[menu,{...menu}]}};
  assert.equal(ownerSaveReadbackMatches(duplicate,storeId,
    {action:'soldout',menuId,soldout:false}),false);
  assert.equal(ownerSaveReadbackMatches(duplicate,storeId,
    {action:'taste',menuId,level:7,flavor:'칼칼한',category:'국물·면'}),false);
  assert.equal(ownerSaveReadbackMatches(duplicate,storeId,
    {action:'register',menuId,name:menu.name,price:menu.price,level:7,
      flavor:menu.flavor,category:menu.category,photoPath:menu.photoPath}),false);
});

test('duplicate menu IDs cannot mask a conflicting persisted value',()=>{
  const conflicting={...menu,soldout:true,level:2,price:9900};
  for(const menus of [[menu,conflicting],[conflicting,menu]]){
    const ambiguous={...snapshot,state:{...snapshot.state,menus}};
    assert.equal(ownerSaveReadbackMatches(ambiguous,storeId,
      {action:'soldout',menuId,soldout:false}),false);
    assert.equal(ownerSaveReadbackMatches(ambiguous,storeId,
      {action:'taste',menuId,level:7,flavor:'칼칼한',category:'국물·면'}),false);
    assert.equal(ownerSaveReadbackMatches(ambiguous,storeId,
      {action:'register',menuId,name:menu.name,price:menu.price,level:7,
        flavor:menu.flavor,category:menu.category,photoPath:menu.photoPath}),false);
  }
});

test('non-HOT readback denies 6 or 7 even when expected and saved values match',()=>{
  for (const planet of ['sweet','rich'] as const) {
    const expected={action:'taste' as const,menuId,level:7,flavor:menu.flavor,category:menu.category};
    assert.equal(ownerSaveReadbackMatches(snapshot,storeId,expected,planet),false);
    const five={...snapshot,state:{...snapshot.state,menus:[{...menu,level:5}]}};
    assert.equal(ownerSaveReadbackMatches(five,storeId,{...expected,level:5},planet),true);
    assert.equal(ownerSaveReadbackMatches(five,storeId,{...expected,level:7},planet),false);
    const six={...snapshot,state:{...snapshot.state,menus:[{...menu,level:6}]}};
    assert.equal(ownerSaveReadbackMatches(six,storeId,{...expected,level:6},planet),false);
  }
});
