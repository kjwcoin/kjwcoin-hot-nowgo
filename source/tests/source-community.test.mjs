import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceTasteInput} from '../lib/source-community.ts';
import {growth,EXP_THRESHOLDS,RANKS} from '../lib/activity/model.ts';
test('taste reports reject out-of-range heat, unknown flavor and absent firsthand consent',()=>{
 const valid={menu:'  테스트   메뉴  ',heat:3,flavor:'얼큰한',note:'맛 기록',consent:true};
 assert.equal(sourceTasteInput(valid).menu,'테스트 메뉴');
 for(const bad of [{...valid,heat:0},{...valid,heat:6},{...valid,flavor:'없는 결'},{...valid,consent:false},{...valid,menu:''},{...valid,note:'a'.repeat(501)}])assert.throws(()=>sourceTasteInput(bad));
});
test('growth becomes progressively harder and a first report never grants castle rank',()=>{
 assert.equal(growth(50).level,2);assert.equal(growth(60).rank.name,'탐험가');
 assert.equal(growth(150).rank.name,'기사');assert.equal(growth(500).rank.name,'성주');
 assert.equal(growth(38000).rank.name,'왕');assert.equal(growth(41000).level,31);
 for(let i=1;i<EXP_THRESHOLDS.length;i++){assert.ok(EXP_THRESHOLDS[i]>EXP_THRESHOLDS[i-1]);if(i>1)assert.ok(EXP_THRESHOLDS[i]-EXP_THRESHOLDS[i-1]>EXP_THRESHOLDS[i-1]-EXP_THRESHOLDS[i-2]);}
 for(const rank of RANKS)assert.equal(growth(rank.xp).rank.name,rank.name);
});
