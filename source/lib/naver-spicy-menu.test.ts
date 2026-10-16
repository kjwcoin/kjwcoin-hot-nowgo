import assert from 'node:assert/strict';
import {test} from 'node:test';
import {classifyNaverSpicyMenu} from './naver-spicy-menu.ts';

const now=Date.parse('2026-10-16T00:00:00Z');
const base={placeUrl:'https://place.naver.com/restaurant/123/menu',menuName:'떡볶이',provenance:'independent_owner' as const,permissionReference:'owner-consent-42',permissionScope:{persistFacts:true,publicDisplay:true,commercialUse:true},countryCode:'KR',checkedAt:'2026-10-12T00:00:00Z'};
const check=(v:Parameters<typeof classifyNaverSpicyMenu>[0])=>classifyNaverSpicyMenu(v,now);

test('eligible HOT menu must have independent rights and literal menu evidence',()=>{
 assert.equal(check({...base,menuName:'매운맛 닭발'}).reason,'eligible_text');
 assert.equal(check({...base,menuDescription:'매운맛 단계 선택'}).reason,'eligible_text');
 assert.equal(check({...base,menuName:'닭발'}).reason,'no_spicy_menu_evidence');
});

test('verified heat pepper accepted but a decorative pepper is not evidence',()=>{
 assert.equal(check({...base,pepperIndicatorVerified:true,pepperIndicatorContext:'spice_level'}).reason,'eligible_pepper');
 assert.equal(check({...base,pepperIndicatorVerified:true,pepperIndicatorContext:'decorative'}).eligible,false);
 assert.equal(check({...base,pepperIndicatorVerified:false,pepperIndicatorContext:'spice_level'}).eligible,false);
});

test('rights reference alone cannot authorize import; deny NAVER Search',()=>{
 assert.equal(check({...base,menuName:'매운맛 닭발',provenance:'naver_search'}).reason,'prohibited_api_import');
 for(const patch of [{permissionReference:''},{permissionScope:undefined},{permissionScope:{...base.permissionScope,persistFacts:false}},{permissionScope:{...base.permissionScope,commercialUse:false}},{permissionScope:{...base.permissionScope,publicDisplay:false}}]){
  assert.equal(check({...base,...patch,menuName:'매운맛 닭발'}).reason,'missing_permission');
 }
});

test('reject invalid source, non-Korean stores and future-dated evidence',()=>{
 for(const url of ['https://place.naver.com.evil.tld/restaurant/123','http://place.naver.com/restaurant/123','https://user@place.naver.com/restaurant/123','https://example.com/restaurant/123']){
  assert.equal(check({...base,placeUrl:url,menuName:'매운맛 닭발'}).reason,'invalid_source');
 }
 assert.equal(check({...base,countryCode:'US',menuName:'매운맛 닭발'}).reason,'outside_korea');
 assert.equal(check({...base,checkedAt:'2026-12-01T00:00:00Z',menuName:'매운맛 닭발'}).reason,'invalid_evidence');
});
