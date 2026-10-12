import assert from 'node:assert/strict';
import {test} from 'node:test';
import {classifyNaverSpicyMenu} from './naver-spicy-menu.ts';
const base={storeAddress:'서울특별시 종로구 세종대로 1',latitude:37.57,longitude:126.98,placeUrl:'https://place.naver.com/restaurant/123/menu',menuName:'떡볶이',permissionReference:'owner-consent-42',checkedAt:'2026-10-12T00:00:00Z'};
test('literal spicy menu text qualifies with permission',()=>{
 assert.equal(classifyNaverSpicyMenu({...base,menuDescription:'신라면 매운맛'}).eligible,true);
 assert.equal(classifyNaverSpicyMenu({...base,menuName:'매운맛 닭발'}).eligible,true);
});
test('verified pepper mark qualifies but decorative pepper does not',()=>{
 assert.equal(classifyNaverSpicyMenu({...base,pepperIndicatorVerified:true,pepperIndicatorContext:'spice_level'}).eligible,true);
 assert.equal(classifyNaverSpicyMenu({...base,pepperIndicatorVerified:true,pepperIndicatorContext:'decorative'}).eligible,false);
});
test('store or food type alone never qualifies, and permission is mandatory',()=>{
 assert.equal(classifyNaverSpicyMenu({...base,menuName:'마라탕'}).eligible,false);
 assert.equal(classifyNaverSpicyMenu({...base,menuName:'매운맛 곱창',permissionReference:''}).eligible,false);
 assert.equal(classifyNaverSpicyMenu({...base,menuName:'매운맛 곱창',placeUrl:'https://example.com'}).eligible,false);
});

test('only verified domestic stores qualify',()=>{
 assert.equal(classifyNaverSpicyMenu({...base,menuName:'매운맛 김치찌개',storeAddress:'Tokyo Shinjuku Japan'}).reason,'outside_korea');
 assert.equal(classifyNaverSpicyMenu({...base,menuName:'매운맛 김치찌개',latitude:35.68,longitude:139.69}).reason,'outside_korea');
 assert.equal(classifyNaverSpicyMenu({...base,menuName:'매운맛 김치찌개'}).eligible,true);
});
