import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {isReadonlySourceStoreId, readonlySourceStoreFeed} from '../lib/readonly-source-listings.ts';

const origin = 'https://hot.nowgo.space';
const userId = '11111111-1111-4111-8111-111111111111';
const unrelatedId = '22222222-2222-4222-8222-222222222222';
const stores = readonlySourceStoreFeed().stores;
const theme = {flavors: ['전체', '칼칼한'], categories: ['국수'], tables: {}, consent: 'current'};
const compiled = new Map();
function route(path, dependencies) {
 if (!compiled.has(path)) compiled.set(path, ts.transpileModule(fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
 }).outputText);
 const exports = {};
 vm.runInNewContext(compiled.get(path), {
  exports, URL, Request, Response, Headers, FormData, File, Buffer, Uint8Array, Date, Number, Set, Error,
  crypto: {randomUUID: () => '33333333-3333-4333-8333-333333333333'},
  fetch: () => {throw Error('External fetch is forbidden in this isolated test');},
  require(name) {assert.ok(name in dependencies, 'Unexpected import: ' + name); return dependencies[name];},
 });
 return exports;
}
function uuidForms(id) {
 return [id, id.toUpperCase(), id.replaceAll('-', ''), '{' + id + '}', '  ' + id + '  ', id.replaceAll('-', '').match(/.{1,4}/g).join('-')];
}
function request(path, body, method = 'POST') {
 return new Request(origin + path, {
  method, headers: {host: 'hot.nowgo.space', origin, ...(body instanceof FormData ? {} : {'Content-Type': 'application/json'})},
  ...(method === 'GET' ? {} : {body: body instanceof FormData ? body : JSON.stringify(body)}),
 });
}
const context = action => ({params: Promise.resolve({action})});
const clone = value => JSON.parse(JSON.stringify(value));
function setup({authenticated = true, validOrigin = true, rpcError = null, rpcData = {saved: true}, queryData = {}} = {}) {
 const calls = [];
 const client = {
  async rpc(name, args) {calls.push({kind: 'rpc', name, args: clone(args)}); return {data: rpcData, error: rpcError};},
  from(table) {
   calls.push({kind: 'from', table});
   const query = {
    select(fields) {calls.push({kind: 'select', table, fields}); return query;},
    eq(field, value) {calls.push({kind: 'eq', table, field, value}); return query;},
    async maybeSingle() {return {data: queryData[table] ?? null, error: null};},
    async limit() {return {data: queryData[table] ?? [], error: null};},
    async upsert(data, options) {calls.push({kind: 'upsert', table, data, options}); return {error: null};},
    delete() {calls.push({kind: 'delete', table}); return query;},
    then(resolve, reject) {return Promise.resolve({error: null}).then(resolve, reject);},
   };
   return query;
  },
  storage: {
   from(bucket) {
    calls.push({kind: 'storage', bucket});
    return {
     async upload(path, bytes, options) {calls.push({kind: 'upload', bucket, path, bytes: bytes.length, options}); return {error: null};},
     async remove(paths) {calls.push({kind: 'remove', bucket, paths}); return {error: null};},
    };
   },
  },
 };
 const dependencies = {
  '@/lib/readonly-source-listings': {isReadonlySourceStoreId},
  '@/lib/supabase': {verifiedUser: async () => authenticated ? {user: {id: userId}, client} : null, publicConfig: () => ({ready: true}), publicDb: () => {throw Error('Unexpected public database');}},
  '@/lib/server': {reply: (_request, data, status = 200) => ({data, status}), validOrigin: () => validOrigin, failure: () => ({data: {error: 'unavailable'}, status: 503})},
  '@/lib/site-config': {variantForHost: () => 'hot', siteConfig: () => theme},
 };
 return {calls, client, dependencies};
}
function activityHarness(options) {
 const h = setup(options);
 const sharp = () => {
  h.calls.push({kind: 'sharp'});
  const image = {autoOrient: () => image, resize: () => image, webp: () => image, toBuffer: async () => Buffer.from('encoded-image')};
  return image;
 };
 const handlers = route('app/api/activity/[action]/route.ts', {
  ...h.dependencies,
  '@/lib/activity/model': {planetForVariant: value => value},
  '@/lib/menu-catalog': {menuById: async id => {h.calls.push({kind: 'menuById', id}); return null;}},
  sharp: {default: sharp},
  'node:crypto': {randomUUID: () => '33333333-3333-4333-8333-333333333333'},
 });
 return {...h, handlers};
}
function photoForm(storeId) {
 const form = new FormData();
 form.set('storeId', storeId);
 form.set('photo', new File(['isolated test image'], 'photo.png', {type: 'image/png'}));
 form.set('receiptRef', 'receipt-reference');
 return form;
}
function favoriteHarness(options) {
 const h = setup(options);
 const reported = {placeId: 'reported-' + 'a'.repeat(24), id: 'legacy-menu', shop: '실제 기존 매장', area: '부산광역시 중구 실제길 1', isDemo: false};
 const handlers = route('app/api/customer/[action]/route.ts', {
  ...h.dependencies,
  '@/lib/menu-catalog': {menuByPlaceId: async id => {h.calls.push({kind: 'menuByPlaceId', id}); return id === reported.placeId ? reported : null;}},
  'node:crypto': {createHash}, '@/lib/existing-owner': {isExistingOwner: async () => false}, '@/lib/loyalty': {LEVELS: [{}]},
 });
 return {...h, handlers, reported};
}
function signupHarness(options) {
 const h = setup(options);
 const handlers = route('app/api/owner/signup/route.ts', {
  ...h.dependencies,
  '@/lib/owner-signup-bridge': {ownerSignupRequest: async (...args) => {h.calls.push({kind: 'bridge', target: args[2]}); throw Error('Unexpected signup bridge');}},
  '@/lib/map-owner-api': {
   readOwnerForm: req => req.formData(),
   prepareOwnerPhoto: async () => {h.calls.push({kind: 'prepareOwnerPhoto'}); return Buffer.from('encoded-image');},
   ownerError: () => ({data: {error: 'unavailable'}, status: 503}),
  },
  '@/lib/korean-region': {isKoreanAddress: value => value.startsWith('부산광역시 '), isKoreanCoordinate: (lat, lng) => lat === 35.1 && lng === 129.1},
 });
 return {...h, handlers};
}
function signupForm(storeId, resume = false) {
 const form = photoForm(storeId);
 for (const [key, value] of Object.entries({phone: '01012345678', consent: 'yes', shop: '실제 기존 매장', address: '부산광역시 중구 실제길 1', menu: '매운 국수', price: '9000', level: '3', flavor: '칼칼한', category: '국수', lat: '35.1', lng: '129.1'})) form.set(key, value);
 if (resume) form.set('resume', 'yes');
 return form;
}

test('all five reserved source UUIDs are recognized across equivalent PostgreSQL text forms', () => {
 assert.equal(stores.length, 5);
 for (const store of stores) for (const id of uuidForms(store.id)) assert.equal(isReadonlySourceStoreId(id), true, id);
 for (const value of [null, {}, 42, '', 'not-a-store', unrelatedId]) assert.equal(isReadonlySourceStoreId(value), false);
});

test('80 source photo/receipt/event cases stop before image work, storage, catalog or RPC', async () => {
 const h = activityHarness();
 let attempts = 0;
 for (const store of stores) for (const id of uuidForms(store.id).slice(0, 4)) {
  for (const action of ['photo', 'receipt']) {
   const result = await h.handlers.POST(request('/api/activity/' + action, photoForm(id)), context(action));
   assert.equal(result.status, 409, action + ': ' + id);
   assert.equal(result.data.code, 'source_registration_pending');
   attempts++;
  }
  for (const body of [{storeId: id}, {target: 'nowgo-' + id}]) {
   const result = await h.handlers.POST(request('/api/activity/event', body), context('event'));
   assert.equal(result.status, 409, JSON.stringify(body));
   assert.equal(result.data.code, 'source_registration_pending');
   attempts++;
  }
 }
 assert.equal(attempts, 80);
 assert.deepEqual(h.calls, []);
});

test('activity also rejects whitespace, alternate hyphens and mixed-case nowgo prefixes', async () => {
 const h = activityHarness();
 for (const store of stores) for (const id of uuidForms(store.id)) {
  for (const target of [id, 'NOWGO-' + id, 'Nowgo-' + id]) {
   const result = await h.handlers.POST(request('/api/activity/event', {target}), context('event'));
   assert.equal(result.status, 409, target);
  }
 }
 assert.deepEqual(h.calls, []);
});

test('ordinary unrelated activity photos and events keep their original upload/RPC flow', async () => {
 const h = activityHarness();
 const photo = await h.handlers.POST(request('/api/activity/photo', photoForm(unrelatedId)), context('photo'));
 assert.equal(photo.status, 201);
 assert.deepEqual(h.calls.map(call => call.kind), ['sharp', 'storage', 'upload', 'rpc']);
 assert.equal(h.calls[2].bucket, 'planet-private');
 assert.equal(h.calls[3].name, 'ng_planet_action');
 assert.equal(h.calls[3].args.p_data.storeId, unrelatedId);
 h.calls.length = 0;
 const event = await h.handlers.POST(request('/api/activity/event', {target: 'nowgo-' + unrelatedId}), context('event'));
 assert.equal(event.status, 200);
 assert.equal(h.calls.length, 1);
 assert.equal(h.calls[0].args.p_data.storeId, unrelatedId);
});

test('favorite GET and POST reject every source UUID form without lookup or mutation', async () => {
 const h = favoriteHarness();
 for (const store of stores) for (const id of uuidForms(store.id)) {
  const get = await h.handlers.GET(request('/api/customer/favorite?' + new URLSearchParams({storeId: id}), undefined, 'GET'), context('favorite'));
  assert.equal(get.status, 409, 'GET ' + id);
  assert.equal(get.data.code, 'source_registration_pending');
  for (const active of [true, false]) {
   const post = await h.handlers.POST(request('/api/customer/favorite', {storeId: id, active}), context('favorite'));
   // The existing favorite write API accepts only dashed UUIDs. Other equivalent
   // text forms fail validation before reaching its source-specific 409 guard.
   assert.equal(post.status, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) ? 409 : 400, 'POST ' + id);
   assert.equal(post.data.registered, undefined);
  }
 }
 assert.deepEqual(h.calls, []);
});

test('unrelated existing-store favorite reads and writes keep exact database behavior', async () => {
 const h = favoriteHarness({queryData: {store_favorites: {store_id: unrelatedId}}});
 const get = await h.handlers.GET(request('/api/customer/favorite?storeId=' + unrelatedId, undefined, 'GET'), context('favorite'));
 assert.equal(get.status, 200);
 assert.equal(get.data.registered, true);
 assert.deepEqual(h.calls.filter(call => call.kind === 'from').map(call => call.table), ['store_favorites', 'regular_home_hidden']);
 h.calls.length = 0;
 for (const active of [true, false]) {
  const post = await h.handlers.POST(request('/api/customer/favorite', {storeId: unrelatedId, active}), context('favorite'));
  assert.equal(post.status, 200);
  assert.equal(post.data.registered, active);
 }
 assert.deepEqual(h.calls, [true, false].map(active => ({kind: 'rpc', name: 'ng_customer_set_favorite', args: {p_store: unrelatedId, p_active: active}})));
});

test('legacy reported-place favorites remain separate and usable', async () => {
 const h = favoriteHarness({queryData: {ng_map_place_favorites: {place_key: 'present'}}});
 const get = await h.handlers.GET(request('/api/customer/favorite?placeId=' + h.reported.placeId, undefined, 'GET'), context('favorite'));
 assert.equal(get.status, 200);
 assert.equal(get.data.registered, true);
 h.calls.length = 0;
 const post = await h.handlers.POST(request('/api/customer/favorite', {placeId: h.reported.placeId, active: true}), context('favorite'));
 assert.equal(post.status, 200);
 assert.equal(post.data.registered, true);
 assert.equal(h.calls.find(call => call.kind === 'upsert').data.place_id, h.reported.placeId);
 assert.ok(h.calls.every(call => call.kind !== 'rpc'));
});

test('owner signup rejects source UUID forms including resume before photo, bridge or database work', async () => {
 const h = signupHarness();
 for (const store of stores) for (const id of uuidForms(store.id)) for (const resume of [false, true]) {
  const result = await h.handlers.POST(request('/api/owner/signup', signupForm(id, resume)));
  assert.equal(result.status, 409, JSON.stringify({id, resume}));
  assert.equal(result.data.code, 'source_registration_pending');
  assert.equal(result.data.ok, undefined);
 }
 assert.deepEqual(h.calls, []);
});

test('ordinary existing-store signup contact and resume flows remain available', async () => {
 const contact = signupHarness({rpcData: {storeId: unrelatedId}});
 const result = await contact.handlers.POST(request('/api/owner/signup', signupForm(unrelatedId)));
 assert.equal(result.status, 200);
 assert.equal(result.data.ok, true);
 assert.deepEqual(contact.calls, [{kind: 'rpc', name: 'ng_map_register_contact', args: {p_phone: '01012345678', p_planet: 'hot', p_store: unrelatedId}}]);
 const resume = signupHarness({rpcData: {storeId: unrelatedId}, queryData: {ng_map_owned_menu_catalog: [{id: 'existing-menu'}]}});
 const resumed = await resume.handlers.POST(request('/api/owner/signup', signupForm(unrelatedId, true)));
 assert.equal(resumed.status, 200);
 assert.equal(resumed.data.ok, true);
 assert.equal(resumed.data.storeId, unrelatedId);
 assert.equal(resume.calls[0].kind, 'prepareOwnerPhoto');
 assert.equal(resume.calls.at(-1).name, 'ng_map_register_contact');
 assert.ok(resume.calls.every(call => !['upload', 'storage', 'bridge'].includes(call.kind)));
});

test('auth and origin rejection precede all source and unrelated activity/favorite/signup side effects', async () => {
 for (const [options, status] of [[{authenticated: false}, 401], [{validOrigin: false}, 403]]) {
  for (const id of [stores[0].id, unrelatedId]) {
   const activity = activityHarness(options);
   assert.equal((await activity.handlers.POST(request('/api/activity/photo', photoForm(id)), context('photo'))).status, status);
   assert.deepEqual(activity.calls, []);
   const favorite = favoriteHarness(options);
   assert.equal((await favorite.handlers.POST(request('/api/customer/favorite', {storeId: id, active: true}), context('favorite'))).status, status);
   assert.deepEqual(favorite.calls, []);
   const signup = signupHarness(options);
   assert.equal((await signup.handlers.POST(request('/api/owner/signup', signupForm(id)))).status, status);
   assert.deepEqual(signup.calls, []);
  }
 }
 const anonymous = favoriteHarness({authenticated: false});
 assert.equal((await anonymous.handlers.GET(request('/api/customer/favorite?storeId=' + stores[0].id, undefined, 'GET'), context('favorite'))).status, 401);
 assert.deepEqual(anonymous.calls, []);
});

test('malformed JSON and form bodies never become a successful source write or call downstream tools', async () => {
 for (const body of ['{', 'null']) {
  const activity = activityHarness();
  const activityResult = await activity.handlers.POST(new Request(origin + '/api/activity/event', {method: 'POST', headers: {origin, 'Content-Type': 'application/json'}, body}), context('event'));
  assert.ok(activityResult.status >= 400);
  assert.deepEqual(activity.calls, []);
  const favorite = favoriteHarness();
  const favoriteResult = await favorite.handlers.POST(new Request(origin + '/api/customer/favorite', {method: 'POST', headers: {origin, 'Content-Type': 'application/json'}, body}), context('favorite'));
  assert.ok(favoriteResult.status >= 400);
  assert.deepEqual(favorite.calls, []);
 }
 const favorite = favoriteHarness();
 const invalidFavorite = await favorite.handlers.POST(request('/api/customer/favorite', []), context('favorite'));
 assert.equal(invalidFavorite.status, 400);
 assert.deepEqual(favorite.calls, []);
 const signup = signupHarness();
 const result = await signup.handlers.POST(new Request(origin + '/api/owner/signup', {method: 'POST', headers: {origin, 'Content-Type': 'multipart/form-data; boundary=broken'}, body: 'malformed'}));
 assert.ok(result.status >= 400);
 assert.deepEqual(signup.calls, []);
});

test('unrelated activity rate-limit failures retain cleanup and never report saved success', async () => {
 const h = activityHarness({rpcError: {message: 'RATE_LIMIT'}});
 const result = await h.handlers.POST(request('/api/activity/photo', photoForm(unrelatedId)), context('photo'));
 assert.equal(result.status, 400);
 assert.match(result.data.error, /조금 쉬었다가/);
 assert.equal(result.data.saved, undefined);
 assert.deepEqual(h.calls.map(call => call.kind), ['sharp', 'storage', 'upload', 'rpc', 'storage', 'remove']);
 assert.equal(h.calls.at(-1).paths[0], h.calls.find(call => call.kind === 'upload').path);
});
