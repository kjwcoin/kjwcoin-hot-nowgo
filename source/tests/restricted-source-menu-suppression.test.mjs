import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import expected from './fixtures/restricted-source-menu-suppression.json' with {type:'json'};
import fullRegistry from '../data/hot-reviewed-source-registry.json' with {type:'json'};
import {reviewed591Records as records} from '../lib/readonly-source-records.ts';
import * as readonly from '../lib/readonly-source-listings.ts';
import * as sourced from '../lib/sourced-store.ts';
import * as contracts from '../lib/source-feed-contract.ts';
import * as grouped from '../lib/map-sourced-stores.ts';
import * as identity from '../lib/store-identity.ts';
import {isKoreanCoordinate} from '../lib/korean-region.ts';
import {sourceUi,moduleAt,elements,hookHarness} from './helpers/source-ui-components.mjs';

const baselineRefs=new Set(records.map(r=>r.source_ref));
const baselineMenuKeys=new Set(["fcbfdacf75a5581f", "1ad07e71f42b72ca", "c35ddfa31c3c1c1b", "34bd3e15c08952dd", "5d14778b2e23a240", "3cb54a1cf2a6eabb", "82e114b40294be71", "0e392ce773b69d8e", "f7f7e2c1a7e587be", "2010dd697d144567", "9ed8e30bf51231c8", "4882fc839b6cf9bd", "31968ca38ee98509", "individual-menu-ma0101202212a0013161", "individual-menu-ma010120220800023018", "individual-menu-ma010120220810619843"]);
const registry={...fullRegistry,records:Object.fromEntries(Object.entries(fullRegistry.records).filter(([ref])=>baselineRefs.has(ref))),menus:Object.fromEntries(Object.entries(fullRegistry.menus).filter(([key])=>baselineMenuKeys.has(key)))};
// This fixture contains only approved store IDs, counts and baseline digests.
// Restricted menu content and provenance are deliberately not retained as fixtures.
const ids=new Set(expected.affectedIds),feed=readonly.readonlySourceStoreFeed('hot-source-591-v2');
const affected=feed.stores.filter(store=>ids.has(store.id));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sourceRow=row=>({...row,owner_id:null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,publication_state:'DISCOVERED'});
const discovery=moduleAt('lib/store-discovery.ts',{'./sourced-store.ts':sourced,'./social-preview':{socialMetadata:()=>({openGraph:{},twitter:{}})}});
const restrictedSource=/yupdduk\.com|yup-event-detail/i;

test('current contract preserves all174 reviewed identities while old contracts retain only their unchanged rows',()=>{
 assert.equal(ids.size,174);assert.equal(feed.stores.length,591);assert.equal(records.length,591);
 assert.deepEqual(affected.map(store=>store.id),expected.affectedIds);assert.equal(contracts.MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT,'hot-source-591-v2');assert.equal(feed.stores.filter(store=>!store.menus.length).length,174);for(const store of affected)assert.deepEqual(store.menus,[]);assert.deepEqual(sourced.parseSourcedStoreFeed(feed),feed);assert.doesNotMatch(JSON.stringify(feed),restrictedSource);assert.doesNotMatch(JSON.stringify(feed),/revokedMenuIds|aliasBindings|factualUseReview|rawRecord/);
 for(const [contract,count] of Object.entries(expected.removedFromLegacyContracts)){
  const snapshot=readonly.readonlySourceStoreFeed(contract);
  assert.equal(snapshot.stores.length,Number(contract.split('-')[2])-count);assert.equal(snapshot.stores.some(store=>ids.has(store.id)),false);
  assert.equal(snapshot.stores.some(store=>!store.menus.length),false);assert.equal(hash(snapshot.stores),expected.legacyRemainderHashes[contract]);
  assert.deepEqual(sourced.parseSourcedStoreFeed(snapshot),snapshot);
  assert.notEqual(hash(snapshot),expected.baselineFeedHashes[contract]);
  assert.doesNotMatch(JSON.stringify(snapshot),restrictedSource);
  assert.doesNotMatch(JSON.stringify(snapshot),/revokedMenuIds|aliasBindings|factualUseReview|rawRecord/);
 }
});

test('all public identities, locations, aliases and417 unaffected stores remain baseline-exact',()=>{
 assert.equal(hash(feed.stores.map(store=>{const facts={...store};delete facts.menus;return facts})),expected.allPublicIdentityFactsSha256);
 const untouched=feed.stores.filter(store=>!ids.has(store.id));assert.equal(untouched.length,417);
 assert.equal(hash(untouched),expected.unaffectedPublicStoresSha256);
 assert.equal(hash(records.filter(row=>!ids.has(row.id))),expected.unaffectedRawRecordsSha256);
 assert.equal(hash(records.map(row=>({id:row.id,aliasBindings:row.source_metadata.aliasBindings||[]}))),expected.aliasBindingsSha256);
 assert.equal(hash(Object.fromEntries(Object.entries(registry.records).filter(([,row])=>!ids.has(row.id)))),expected.unaffectedRegistryRecordsSha256);
 assert.equal(hash(registry.menus),expected.unaffectedRegistryMenusSha256);
});

test('only174 reviewed registry pairings become identity-only and no restricted source content survives server records',()=>{
 const identityOnly=Object.values(registry.records).filter(row=>row.menuKey===null);
 assert.deepEqual(identityOnly.map(row=>row.id).sort(),[...ids].sort());
 for(const row of records.filter(row=>ids.has(row.id))){
  const meta=row.source_metadata;assert.equal(registry.records[row.source_ref].menuKey,null);
  assert.deepEqual(meta.menus,[]);assert.deepEqual(meta.revokedMenuIds,[row.source_ref+':menu:1']);
  assert.equal(meta.factualUseReview?.oneMenuFact,undefined);assert.equal(meta.fieldRights?.oneMenuFact,undefined);
  assert.doesNotMatch(JSON.stringify(row),restrictedSource);
 }
 assert.doesNotMatch(JSON.stringify(registry),restrictedSource);
});

test('removed canonical menu IDs and all aliases remain read-only with no companion binding required',()=>{
 let revoked=0;
 for(const row of records){
  const meta=row.source_metadata;
  for(const menu_id of meta.revokedMenuIds||[]){
   revoked++;assert.equal(typeof menu_id,'string');
   for(const binding of [{menu_id},{menu_id,nowgo_store_id:null,place_id:null},{menu_id,nowgo_store_id:'unrelated',place_id:'forged'}])assert.equal(readonly.isReadonlySourceReportBinding(binding),true);
  }
  for(const alias of meta.aliasBindings||[]){
   assert.equal(readonly.isReadonlySourceStoreId(alias.id),true);
   assert.equal(readonly.isReadonlySourceReportBinding({menu_id:alias.menuId}),true);
  }
 }
 assert.equal(revoked,174);
 assert.equal(readonly.isReadonlySourceReportBinding({menu_id:'data-go-kr-15083033-UNREVIEWED:menu:1'}),false);
});

test('identity-only parser rejects menu resurrection and does not allow empty menus for other stores',()=>{
 const allowedMenu=feed.stores.find(store=>store.menus.length).menus[0];
 for(const store of affected){
  const fabricated={...structuredClone(allowedMenu),id:store.sourceRef+':menu:1',name:'Unreviewed synthetic menu'};
  assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[{...store,menus:[fabricated]}]}),/invalid_source_store/);
  const row=structuredClone(records.find(row=>row.id===store.id));row.source_metadata.menus=[fabricated];
  assert.equal(sourced.publicSourcedStore(sourceRow(row)),null);
  for(const change of [{name:store.name+' changed'},{address:store.address+' changed'},{coordinates:{...store.coordinates,lat:store.coordinates.lat+0.01}},{ownerClaimVerified:true},{reportingState:'enabled'}])assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[{...store,...change}]}),/invalid_source_store/);
 }
 for(const store of feed.stores.filter(store=>!ids.has(store.id)))assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[{...store,menus:[]}]}),/invalid_source_store/);
});

test('all174 empty-menu cards and details are useful, clickable and free of menu attribution or invented facts',()=>{
 const ui=sourceUi();
 for(const store of affected){
  for(const Component of [ui.Card,ui.Detail]){
   const html=renderToStaticMarkup(React.createElement(Component,{store,onBack(){}}));
   assert.ok(html.includes(store.name));assert.ok(html.includes(store.address));assert.match(html,/확인된 메뉴 정보가 없어요/);
   assert.doesNotMatch(html,restrictedSource);assert.doesNotMatch(html,/data-source-menu-id=|브랜드 공통 메뉴|브랜드 공식 메뉴 출처|공식 관광자료 메뉴 출처|메뉴 자료 기준일|0원|data-live-component|<form/);
  }
  let selected;const card=ui.Card({store,onSelect:(...args)=>{selected=args}});
  const button=elements(card).find(node=>node.type==='button');assert.ok(button);button.props.onClick();assert.deepEqual(selected,[store]);
  const metadata=discovery.sourcedStoreMetadata(store,'hot.nowgo.space'),notice=discovery.sourceFactsNotice(store),schema=JSON.stringify(discovery.sourcedStoreJsonLd(store));
  assert.equal(metadata.alternates.canonical,'https://hot.nowgo.space/p/'+store.slug);assert.equal(metadata.robots.index,true);
  assert.match(notice,/확인된 메뉴 정보가 없습니다/);assert.doesNotMatch(notice,/브랜드 공통|관광자료|메뉴 출처 확인일|메뉴 자료 기준일/);
  assert.doesNotMatch(JSON.stringify({metadata,notice,schema}),restrictedSource);
  assert.doesNotMatch(schema,/aggregateRating|reviewCount|ratingValue|offers|hasMenu|openingHours/);
 }
});

test('menu suppression preserves nationwide counts, gray source pins and existing genuine reports',()=>{
 const bounds={south:33,north:39.6,west:124,east:132};
 const count=moduleAt('lib/viewport-store-count.ts',{'./supabase':{publicDb:()=>{throw Error('No database access')},publicConfig:()=>({ready:false})},'./site-config':{siteConfig:()=>({flavors:[],categories:[],tables:{}})},'./store-identity.ts':identity,'./map-sourced-stores.ts':grouped,'./sourced-store-feed.ts':{readSourcedStoreFeed:async()=>feed},'./korean-region.ts':{isKoreanCoordinate}});
 assert.equal(count.countViewportStores([],bounds,true,feed.stores),591);
 assert.equal(count.countViewportStores([],bounds,true,[...feed.stores,...affected]),591);
 const baseline={query:'',heat:0,budget:0,flavor:'전체',category:'전체'};
 for(const store of affected){
  assert.equal(store.pinStatus,'gray');assert.equal(store.registrationState,'source-only');assert.equal(store.reportingState,'pending');assert.equal(store.ownerClaimVerified,false);
  assert.equal(grouped.sourcedStoreMatches(store,baseline),true);assert.equal(grouped.sourcedStoreMatches(store,{...baseline,query:store.name}),true);
  for(const filters of [{heat:3},{budget:10000},{flavor:'칼칼한'},{category:'떡볶이'}])assert.equal(grouped.sourcedStoreMatches(store,{...baseline,...filters}),false);
  const report={id:'synthetic-genuine-report',placeId:'nowgo-'+store.id,shop:store.name,area:store.address,lat:store.coordinates.lat,lng:store.coordinates.lon,name:'Reported menu',price:9000,heat:3,verifiedOwner:false,source:'report'};
  const before=JSON.stringify(report),groups=grouped.mapStoreGroups([report],feed.stores),group=groups.find(group=>group.source?.id===store.id);
  assert.equal(groups.length,591);assert.equal(grouped.sourceIsPrimaryPin(group),true);assert.strictEqual(group.catalog.menus[0],report);assert.equal(JSON.stringify(report),before);
 }
});

test('Explorer keeps a selected identity-only store after refresh and permits returning to the list',()=>{
 const state={status:'ready',feed},h=hookHarness(),ui=sourceUi({react:h.react,sourceState:state}),chosen=affected[0];
 const render=()=>elements(h.render(()=>ui.Explorer({variant:'hot'})));
 let nodes=render();nodes.find(node=>node.type===ui.Map).props.onSourceSelect(chosen);nodes=render();
 let detail=nodes.find(node=>node.type===ui.Detail);assert.equal(detail.props.store.id,chosen.id);assert.deepEqual(detail.props.store.menus,[]);
 state.feed=structuredClone(feed);nodes=render();detail=nodes.find(node=>node.type===ui.Detail);assert.equal(detail.props.store.id,chosen.id);
 assert.equal(nodes.find(node=>node.type===ui.Map).props.sourcedStores.length,591);detail.props.onBack();nodes=render();assert.equal(nodes.some(node=>node.type===ui.Detail),false);
});

test('embedded App keeps591 pins and links identity-only cards to their canonical detail pages',()=>{
 const h=hookHarness(),ui=sourceUi({react:h.react,stores:feed.stores});
 const render=()=>elements(h.render(()=>ui.App({variant:'hot'})));
 let nodes=render();assert.equal(nodes.find(node=>node.type===ui.Map).props.sourcedStores.length,591);
 nodes.find(node=>node.type==='button'&&node.props['aria-controls']==='app-map-results-list').props.onClick();nodes=render();
 const cards=nodes.filter(node=>node.type===ui.Card);assert.equal(cards.length,591);
 for(const card of cards.filter(node=>ids.has(node.props.store.id))){const html=renderToStaticMarkup(card);assert.ok(html.includes('https://hot.nowgo.space/p/'+card.props.store.slug));assert.match(html,/확인된 메뉴 정보가 없어요/);assert.doesNotMatch(html,/data-source-menu-id=/);}
});

test('old validators cannot keep removed menu facts alive in any contract',async()=>{
 const api=moduleAt('lib/sourced-store-feed.ts',{'node:crypto':{createHash},'./source-feed-contract.ts':contracts,'./sourced-store.ts':sourced,'./readonly-source-listings.ts':readonly},{process:{env:{NOWGO_UNCLAIMED_STORES_ENABLED:'true'}}});
 const {GET}=moduleAt('app/api/sourced-stores/route.ts',{'@/lib/source-feed-contract':contracts,'@/lib/server':{reply:(_request,data,status=200)=>Response.json(data,{status})},'@/lib/site-config':{variantForHost:()=> 'hot'},'@/lib/sourced-store-feed':api},{Response,URL});
 for(const contract of [...Object.keys(expected.removedFromLegacyContracts),contracts.MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT]){
  const previous=contract===contracts.MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT?contracts.WITHDRAWN_MENU_COMPAT_SOURCE_FEED_CONTRACT:contract,oldTag=expected.baselineEtags[previous];
  const request=etag=>new Request('https://hot.nowgo.space/api/sourced-stores',{headers:{host:'hot.nowgo.space',[contracts.SOURCE_FEED_CONTRACT_HEADER]:contract,'If-None-Match':etag}});
  const result=await GET(request(oldTag));assert.equal(result.status,200);assert.notEqual(result.headers.get('etag'),oldTag);
  const body=await result.json();assert.equal(body.stores.filter(store=>!store.menus.length).length,contract===contracts.MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT?174:0);assert.equal(body.stores.length,contract===contracts.MENU_WITHDRAWAL_SOURCE_FEED_CONTRACT?591:Number(contract.split('-')[2])-expected.removedFromLegacyContracts[contract]);assert.doesNotMatch(JSON.stringify(body),restrictedSource);
  const unchanged=await GET(request(result.headers.get('etag')));assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');
 }
});
