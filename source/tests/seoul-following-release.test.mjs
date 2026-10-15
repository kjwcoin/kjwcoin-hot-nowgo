import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {reviewed588Records as records} from '../lib/readonly-source-records.ts';
import base from '../data/hot-source-listings.json' with {type:'json'};
import index from '../data/hot-source-seoul-following/index.json' with {type:'json'};
import registry from '../data/hot-reviewed-source-registry.json' with {type:'json'};
import * as sourced from '../lib/sourced-store.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId,isReadonlySourceReportBinding} from '../lib/readonly-source-listings.ts';
import * as grouped from '../lib/map-sourced-stores.ts';
import {sourceUi,moduleAt,elements,hookHarness} from './helpers/source-ui-components.mjs';
const completeFeed=readonlySourceStoreFeed(),feed={...completeFeed,stores:completeFeed.stores.slice(0,588)},added=feed.stores.slice(130),dookki=added.filter(s=>s.menus[0]?.provenance.brandName==='두끼');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const notice='직접 조리하며 소스 선택에 따라 맵기가 달라집니다. 지점별 재료는 확인되지 않았습니다.';
const discovery=moduleAt('lib/store-discovery.ts',{'./sourced-store.ts':sourced,'./social-preview':{socialMetadata:()=>({openGraph:{},twitter:{}})}});
test('district partitions reproduce the suppressed588 release with matching130 prefix',()=>{
 assert.equal(base.length,130);assert.equal(records.length,588);assert.deepEqual(records.slice(0,130),base);
 assert.equal(hash(records),'87626794c8c7a426c67412b50e6fe58cef09f3c9f66cf7bbeca52e8d3c0aedd9');
 assert.equal(index.total,458);assert.equal(index.districtFiles.length,25);
 for(const item of index.districtFiles){const bytes=readFileSync(new URL('../data/hot-source-seoul-following/'+item.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.equal(bytes.length,item.bytes);assert.equal(JSON.parse(bytes).length,item.count);}
 // This historical release has 581 SBIZ registry rows and seven legacy records.
 assert.equal(records.filter(row=>Object.hasOwn(registry.records,row.source_ref)).length,581);
});
test('588 unique source-only cards retain100 Incheon,5 Busan,483 Seoul and401 remaining brand-common facts',()=>{
 assert.equal(feed.stores.length,588);assert.equal(added.length,458);assert.equal(dookki.length,35);
 for(const [region,n]of [['인천광역시',100],['부산광역시',5],['서울특별시',483]])assert.equal(feed.stores.filter(s=>s.address.startsWith(region)).length,n);
 for(const key of ['id','sourceRef','slug'])assert.equal(new Set(feed.stores.map(s=>s[key])).size,588);
 assert.equal(feed.stores.filter(s=>s.menus.length&&sourced.isBrandCommonMenu(s.menus[0])).length,401);assert.deepEqual(sourced.parseSourcedStoreFeed(feed),feed);assert.equal(feed.stores.filter(s=>!s.menus.length).length,174);assert.equal(added.filter(s=>!s.menus.length).length,143);
 for(const s of added){assert.equal(s.registrationState,'source-only');assert.equal(s.reportingState,'pending');assert.equal(s.ownerClaimVerified,false);assert.equal(s.pinStatus,'gray');assert.equal(s.operatingStatus,null);assert.equal(s.currentMenuAvailability,null);for(const menu of s.menus){for(const k of ['heat','price','image','sourceTaste'])assert.equal(menu[k],null);assert.equal(menu.provenance.branchMenuApplicability,null);assert.equal(menu.provenance.explicitOpenLicense,false);}}
});
test('every new canonical or alias binding remains read-only without downstream effects',()=>{
 const aliases=records.slice(130).flatMap(r=>r.source_metadata.aliasBindings||[]);assert.equal(aliases.length,9);
 for(const s of [...added,...aliases]){for(const id of [s.id,s.id.toUpperCase(),'{'+s.id+'}',s.id.replaceAll('-','')])assert.equal(isReadonlySourceStoreId(id),true);assert.equal(isReadonlySourceReportBinding({place_id:'nowgo-'+s.id}),true);assert.equal(isReadonlySourceReportBinding({menu_id:s.menuId||s.sourceRef+':menu:1'}),true);}
 for(const alias of aliases)assert.equal(feed.stores.some(s=>s.id===alias.id),false);
});
test('all35 Dookki caveats visible and registry-bound, without invented ratings or branch-sale schema',()=>{
 const ui=sourceUi();for(const s of dookki){assert.equal(s.menus[0].provenance.preparationNotice,notice);
 for(const C of [ui.Card,ui.Detail]){const html=renderToStaticMarkup(React.createElement(C,{store:s,onBack(){}}));assert.ok(html.includes(notice));assert.ok(html.includes(sourced.BRAND_COMMON_MENU_NOTICE));assert.match(html,/맵기 미확인/);assert.match(html,/가격 미확인/);assert.doesNotMatch(html,/준비중|준비 중/);}
 assert.ok(discovery.sourceFactsNotice(s).includes(notice));assert.ok(discovery.sourcedStoreMetadata(s,'hot.nowgo.space').description.includes(notice));assert.ok(JSON.stringify(discovery.sourcedStoreJsonLd(s)).includes(notice));assert.doesNotMatch(JSON.stringify(discovery.sourcedStoreJsonLd(s)),/aggregateRating|reviewCount|openingHours|offers|hasMenu|ratingValue|priceRange/);
 for(const replacement of [undefined,'','매우 맵습니다.']){const bad=structuredClone(s);bad.menus[0].provenance.preparationNotice=replacement;assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[bad]}),/invalid_source_store/);}}
 const other=structuredClone(added.find(s=>s.menus.length&&s.menus[0].provenance.brandName!=='두끼'));other.menus[0].provenance.preparationNotice=notice;assert.throws(()=>sourced.parseSourcedStoreFeed({...feed,stores:[other]}),/invalid_source_store/);
});
test('nationwide groups retain588 unique stores and no invented numeric heat matches',()=>{
 assert.equal(grouped.mapStoreGroups([],feed.stores).length,588);assert.equal(grouped.mapStoreGroups([],[...feed.stores,...added]).length,588);
 for(const s of added)for(const heat of [1,2,3,4,5])assert.equal(grouped.sourcedStoreMatches(s,{query:'',heat,budget:0,flavor:'전체',category:'전체'}),false);
 assert.doesNotMatch(JSON.stringify(feed),/rawRecord|dataRowNumber|factualUseReview|duplicateSourceRows/);
});

test('actual HOT panel retains selected IDs across unchanged or version-changed feeds without duplicate cards',()=>{
 const state={status:'ready',feed},h=hookHarness(),ui=sourceUi({react:h.react,sourceState:state});
 const render=()=>elements(h.render(()=>ui.Explorer({variant:'hot'})));
 const chosen=added.find(s=>s.menus.length),menuId=chosen.menus[0].id;let nodes=render();nodes.find(n=>n.type===ui.Map).props.onSourceSelect(chosen,menuId);nodes=render();
 for(const next of [feed,structuredClone(feed),sourced.parseSourcedStoreFeed({...feed,stores:[...feed.stores,chosen]})]){
  state.status='loading';nodes=render();assert.equal(nodes.find(n=>n.type===ui.Detail).props.store.id,chosen.id);
  state.status='ready';state.feed=next;nodes=render();const detail=nodes.find(n=>n.type===ui.Detail),map=nodes.find(n=>n.type===ui.Map);assert.equal(detail.props.store.id,chosen.id);assert.equal(detail.props.menuId,menuId);assert.equal(map.props.selectedSourceId,chosen.id);assert.equal(map.props.sourcedStores.length,588);assert.equal(new Set(map.props.sourcedStores.map(s=>s.id)).size,588);
 }
 state.feed={...feed,stores:feed.stores.filter(s=>s.id!==chosen.id)};nodes=render();assert.equal(nodes.some(n=>n.type===ui.Detail),false);assert.equal(nodes.find(n=>n.type===ui.Map).props.sourcedStores.length,587);
 state.status='error';state.feed=null;nodes=render();assert.equal(nodes.find(n=>n.type===ui.Map).props.sourcedStores.length,0);
});
