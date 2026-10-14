import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import cases from './fixtures/regional-source-cases.json' with {type:'json'};
import activeRegistry from '../data/hot-regional-source-registry.json' with {type:'json'};
import {appendRegionalSourceStores,parseReviewedRegionalStore} from '../lib/regional-source.ts';
import {readonlySourceStoreFeed,isReadonlySourceStoreId} from '../lib/readonly-source-listings.ts';
import {parseSourcedStoreFeed,publicSourcedStore} from '../lib/sourced-store.ts';
import {REVIEWED785_SOURCE_FEED_CONTRACT} from '../lib/source-feed-contract.ts';

const baseline=readonlySourceStoreFeed(REVIEWED785_SOURCE_FEED_CONTRACT),registry=cases.map(c=>c.store),fresh=readonlySourceStoreFeed();
test('original785 stay byte-identical and the regional additions are exact, unscored and unclaimed',()=>{
 assert.equal(baseline.stores.length,785);assert.equal(baseline.complete,true);
 assert.equal(createHash('sha256').update(JSON.stringify(baseline)).digest('hex'),'15badf9da8b1a6525ff07f7877df1aa08bdfb03762492c443317770b6bb4058e');
 assert.equal(fresh.stores.length,785+activeRegistry.length);assert.deepEqual(fresh.stores.slice(785).map(s=>s.id),activeRegistry.map(s=>s.id));
 assert.deepEqual(fresh.stores.slice(0,785),baseline.stores);assert.equal(fresh.complete,true);
 for(const store of fresh.stores.slice(785)){assert.deepEqual(store,registry.find(s=>s.id===store.id));assert.equal(isReadonlySourceStoreId(store.id),true);assert.equal(store.ownerClaimVerified,false);assert.equal(store.menus[0].price,null);assert.equal(store.menus[0].heat,null);assert.equal(store.menus[0].image,null)}
 assert.deepEqual(parseSourcedStoreFeed(fresh),fresh);
});
test('both narrowly supported source kinds preserve exact facts and attribution without invented licences',()=>{
 for(const {row,store} of cases){assert.deepEqual(parseReviewedRegionalStore(row,registry),store);assert.equal(parseReviewedRegionalStore(row,[]),null)}
 assert.equal(cases[1].store.source.licenseName,null);assert.equal(cases[1].store.source.asOf,'2020');
});
test('all identity, location, source, disclosure and menu changes need a matching release review',()=>{
 const mutations=[r=>r.source_metadata.aliasBindings=[{}],r=>r.source_metadata.revokedMenuIds={bad:true},r=>r.id='22222222-2222-4222-8222-222222222222',r=>r.name+='x',r=>r.address+='x',r=>r.lat+=0.01,r=>r.lon+=0.01,r=>r.source_ref+='x',r=>r.slug+='x',r=>r.owner_id='owner',r=>r.archived_at='today',r=>r.trust_disabled_at='today',r=>r.owner_penalty_points=30,r=>r.publication_state='NOINDEX',r=>r.source_metadata.rights.publicDisplay=false,r=>r.source_metadata.reporting.state='enabled',r=>r.source_metadata.sourceUrl+='?x=1',r=>r.source_metadata.sourceAsOf='2026-01-01',r=>r.source_metadata.checkedAt='2026-10-15T00:00:00Z',r=>r.source_metadata.licenseName='Free for everything',r=>r.source_metadata.disclosure.attribution='Other author',r=>r.source_metadata.disclosure.changes='None',r=>r.source_metadata.disclosure.licenseUrl='https://evil.example',r=>r.source_metadata.disclosure.scopeNotice='',r=>r.source_metadata.disclosure.extra='x',r=>r.source_metadata.menus[0].name='other menu',r=>r.source_metadata.menus[0].heat=5,r=>r.source_metadata.menus[0].price=5000,r=>r.source_metadata.menus[0].image='https://example.com/a.jpg',r=>r.source_metadata.menus[0].sourceTaste={description:'very hot'},r=>r.source_metadata.menus.push(structuredClone(r.source_metadata.menus[0]))];
 for(const {row} of cases)for(const mutate of mutations){const r=structuredClone(row);mutate(r);assert.equal(parseReviewedRegionalStore(r,registry),null,mutate.toString())}
});
test('malformed/duplicate additions cannot take down or overwrite any existing store',()=>{
 const bad=structuredClone(cases[0].row);bad.source_metadata.menus[0].heat=5;
 const result=appendRegionalSourceStores(baseline.stores,[null,{},bad,cases[0].row,cases[0].row,cases[1].row],registry);
 assert.equal(result.rejected.length,4);assert.equal(result.acceptedRows.length,2);assert.deepEqual(result.stores.slice(0,785),baseline.stores);assert.equal(result.stores.length,787);
 const overlap=structuredClone(cases[0]);overlap.row.id=baseline.stores[0].id;overlap.store.id=baseline.stores[0].id;const rejected=appendRegionalSourceStores(baseline.stores,[overlap.row],[overlap.store]);assert.equal(rejected.stores.length,785);assert.equal(rejected.rejected.length,1);
});
test('public feed gate rejects forged regional ownership and disclosure',()=>{
 const store=fresh.stores[785];for(const mutate of [s=>s.source.disclosure.attribution='other',s=>s.indexable=false,s=>s.registrationState='database',s=>s.ownerClaimVerified=true,s=>s.menus[0].heat=5]){const s=structuredClone(store);mutate(s);assert.throws(()=>parseSourcedStoreFeed({...fresh,stores:[s]}),/invalid_source_store/)}
 const unapproved=structuredClone(cases[0].row);unapproved.source_ref='unreviewed-new-source';assert.equal(publicSourcedStore(unapproved),null);
});

test('real manifest assembly and feed survive malformed regional aliases, revoked menus and null rows',async()=>{
 const {execFileSync}=await import('node:child_process');
 const result=execFileSync(process.execPath,['--input-type=module','-e',`
 import fs from 'node:fs';import {registerHooks} from 'node:module';
 const path=new URL('./data/hot-regional-source-records.json',import.meta.url);
 const active=JSON.parse(fs.readFileSync(path,'utf8'));
 const alias=structuredClone(active[0]);alias.source_metadata.aliasBindings=[{}];
 const revoked=structuredClone(active[0]);revoked.source_metadata.revokedMenuIds={bad:true};
 registerHooks({load(url,context,next){if(url===path.href)return{format:'json',source:JSON.stringify([alias,revoked,null,...active,active[0]]),shortCircuit:true};return next(url,context)}});
 const {readSourcedStoreFeed}=await import('./lib/sourced-store-feed.ts');
 const {rejectedRegionalSourceRefs}=await import('./lib/readonly-source-records.ts');
 process.env.NOWGO_UNCLAIMED_STORES_ENABLED='true';
 const feed=await readSourcedStoreFeed();console.log(JSON.stringify({count:feed.stores.length,complete:feed.complete,rejected:rejectedRegionalSourceRefs.length}));
 `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.deepEqual(JSON.parse(result),{count:785+activeRegistry.length,complete:false,rejected:4});
});
