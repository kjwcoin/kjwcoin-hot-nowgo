import test from 'node:test';
import assert from 'node:assert/strict';
import {regionSearchQuery} from '../lib/region-search.ts';
test('neighborhood and administrative searches are geocoded; menus remain text searches',()=>{for(const value of ['성수동','서울 성동구 성수동','성수1가','제주시'])assert.equal(regionSearchQuery(value),value);for(const value of ['신라면','냉면','핫치킨피자','HDD','닭발',''])assert.equal(regionSearchQuery(value),null)});
