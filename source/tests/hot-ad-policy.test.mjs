import test from 'node:test';
import assert from 'node:assert/strict';
import {validAdBudget,adGrossAmount,rankAdBids,validAdReference} from '../lib/hot-ad-policy.ts';
import {isConfirmedAdPayment,isRefundedAdPayment,hotAdPaymentConfig} from '../lib/hot-ad-payments.ts';
import {isTasteLevel,displayTasteLevel,tastePinPosition} from '../lib/taste-level.ts';
import {regionSearchQuery} from '../lib/region-search.ts';
import {naverPlace} from '../lib/naver-places.ts';

test('HOT supports stages 6–8 without widening the other planets',()=>{
 for(const n of [6,7,8]){assert.equal(isTasteLevel('hot',n),true);assert.equal(displayTasteLevel('hot',n),n);assert.equal(isTasteLevel('rich',n),false);assert.equal(isTasteLevel('sweet',n),false);}
 for(const n of [0,9,7.5,NaN])assert.equal(isTasteLevel('hot',n),false);
 assert.equal(tastePinPosition('hot',8),'100% 0%');
});
test('highest budget wins; ties go to the earliest final bid; input is unchanged',()=>{
 const bids=[{id:'c',budget:8000,submitted_at:'2026-10-12T01:00:00Z'},{id:'b',budget:15000,submitted_at:'2026-10-12T02:00:00Z'},{id:'a',budget:15000,submitted_at:'2026-10-12T01:00:00Z'}];
 assert.deepEqual(rankAdBids(bids).map(b=>b.id),['a','b','c']);assert.equal(bids[0].id,'c');
});
test('budgets are VAT-exclusive, integral, bounded and explicit',()=>{
 assert.equal(adGrossAmount(8000),8800);assert.equal(adGrossAmount(15000),16500);
 for(const n of [7999,10000001,8000.5,Infinity,'8000'])assert.equal(validAdBudget(n),false);
 assert.equal(validAdReference('similar'),true);assert.equal(validAdReference('inferred_from_pepper_icon'),false);
});
test('only matching live KCP KRW receipts can activate; refunds must be complete',()=>{
 const config={storeId:'store-approved',channelKey:'channel-approved'},p={id:'hotad_order',storeId:config.storeId,amount:{total:8800,cancelled:0},currency:'KRW',status:'PAID',transactionId:'verified-tx',channel:{key:config.channelKey,type:'LIVE',pgProvider:'KCP_V2'}};
 assert.equal(isConfirmedAdPayment(p,'hotad_order',8800,config),true);
 for(const change of [{amount:{total:8000,cancelled:0}},{currency:'USD'},{status:'VIRTUAL_ACCOUNT_ISSUED'},{id:'other'},{storeId:'other'},{channel:{...p.channel,type:'TEST'}},{channel:{...p.channel,pgProvider:'TOSSPAYMENTS'}},{channel:{...p.channel,key:'other'}}])assert.equal(isConfirmedAdPayment({...p,...change},'hotad_order',8800,config),false);
 assert.equal(isRefundedAdPayment({...p,status:'CANCELLED',amount:{total:8800,cancelled:8800}},'hotad_order',8800,config),true);
 assert.equal(isRefundedAdPayment({...p,status:'PARTIAL_CANCELLED',amount:{total:8800,cancelled:800}},'hotad_order',8800,config),false);
 assert.equal(hotAdPaymentConfig().ready,false);
});
test('region searches pan the map while menu names stay menu searches',()=>{
 for(const name of ['성수동','서울 성동구 성수동','성수1가','제주시'])assert.equal(regionSearchQuery(name),name);
 for(const name of ['신라면','냉면','핫치킨피자','HDD','닭발',''])assert.equal(regionSearchQuery(name),null);
});
test('NAVER coordinates use WGS84 E7 and do not invent menu or heat fields',()=>{
 const p=naverPlace({title:'<b>매장</b>',roadAddress:'서울 성동구 성수이로7길 46',category:'음식점>피자',mapx:'1270532172',mapy:'375429779'});
 assert.equal(p.name,'매장');assert.equal(p.lng,127.0532172);assert.equal(p.lat,37.5429779);assert.equal(p.heatVerified,false);assert.equal('heat' in p,false);
 assert.equal(naverPlace({title:'bad',address:'서울',category:'음식점',mapx:309947,mapy:552092}),null);
});
