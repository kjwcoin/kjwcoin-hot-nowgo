import test from 'node:test';
import assert from 'node:assert/strict';
import {isKoreanAddress,isKoreanCoordinate,isKoreanRegion} from '../lib/korean-region.ts';

test('accepts nationwide Korean street addresses and administrative names',()=>{
 for(const address of ['서울특별시 성동구 성수동1가 123','부산광역시 해운대구 우동 12','인천광역시 서구 청라동 123','경기도 수원시 영통구 1','강원특별자치도 춘천시 퇴계동 1','전북특별자치도 전주시 덕진구 1','제주특별자치도 제주시 연동 123'])assert.equal(isKoreanAddress(address),true,address);
 assert.equal(isKoreanRegion('대전'),true);
});
test('rejects foreign and incomplete addresses',()=>{
 for(const address of ['서울','강남구 테헤란로 1','대한민국 도쿄 신주쿠구 123','Shanghai Pudong 123','', '서울특별시 '+ '가'.repeat(201)])assert.equal(isKoreanAddress(address),false,address);
});
test('nationwide coordinate sanity bound includes islands and excludes obvious foreign points',()=>{
 for(const point of [[33.5,126.5],[35.1,129.0],[37.5,127.0],[37.2,131.8]])assert.equal(isKoreanCoordinate(...point),true);
 for(const point of [[null,126.5],[35.1,null],[35.6,139.7],[31,127],[Number.NaN,127]])assert.equal(isKoreanCoordinate(...point),false);
});
