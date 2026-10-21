import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';

function load(path, deps = {}) {
  const exports = {};
  const source = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code, {exports, require(name) {assert.ok(name in deps, name); return deps[name];},
    Request, Response, URL, URLSearchParams, Uint8Array, TextDecoder, Error, Number});
  return exports;
}
const MENU = '00000000-0000-4000-8000-000000000001';
const USER = '00000000-0000-4000-8000-000000000002';
const OTHER = '00000000-0000-4000-8000-000000000003';
const spice = load('lib/hot-spice.ts');
const server = load('lib/server.ts');
const menus = load('lib/menus.ts');
const config = load('lib/site-config.ts', {'./menus': menus});

function harness(options = {}) {
  const calls = [], reads = [];
  const client = {
    rpc: async (name, args) => {calls.push({name, args}); return {error: options.writeError || null};},
    from: table => {
      const filters = []; reads.push({table, filters});
      const query = {select: fields => {reads.at(-1).fields = fields; return query;}, eq: (key, value) => {filters.push([key, value]); return query;},
        single: async () => ({data: {level: options.savedLevel ?? 7}, error: options.readError || null}),
        maybeSingle: async () => ({data: options.own ?? null, error: options.readError || null})};
      return query;
    },
  };
  const route = load('app/api/spice-ratings/route.ts', {
    '@/lib/menu-catalog': {menuById: async (id, planet) => {calls.push({name: 'menuById', id, planet}); return options.missing ? null : {id};}},
    '@/lib/supabase': {verifiedUser: async () => options.signedIn === false ? null : {user: {id: USER}, client},
      publicDb: () => ({rpc: (name, args) => {calls.push({name, args}); return {single: async () => ({data: options.summary ?? {median_level: 3.5, rating_count: '4'}, error: options.summaryError || null})};}})},
    '@/lib/server': server, '@/lib/site-config': config, '@/lib/hot-spice': spice,
  });
  async function request(method, body, overrides = {}) {
    const host = overrides.host || 'hot.nowgo.space';
    const headers = {host, 'content-type': 'application/json'};
    if (overrides.origin !== null) headers.origin = overrides.origin || 'https://' + host;
    if (overrides.auth) headers.authorization = 'Bearer test';
    const req = new Request('https://' + host + '/api/spice-ratings' + (method === 'GET' ? (overrides.query || '?menuId=' + MENU) : ''), {
      method, headers, ...(method === 'POST' ? {body: typeof body === 'string' ? body : JSON.stringify(body)} : {}),
    });
    const result = await route[method](req);
    return {status: result.status, body: await result.json(), headers: result.headers};
  }
  return {request, calls, reads};
}

for (const level of [1, 2, 3, 4, 5, 6, 7]) test(`HOT visitor rating ${level} is saved and verified for the authenticated member`, async () => {
  const h = harness({savedLevel: level});
  const result = await h.request('POST', {menuId: MENU, level});
  assert.equal(result.status, 200); assert.equal(result.body.saved, true);
  const args = h.calls.find(c => c.name === 'hot_menu_spice_upsert').args;
  assert.equal(args.p_menu_id, MENU); assert.equal(args.p_level, level); assert.equal(Object.keys(args).length, 2);
  assert.deepEqual(h.reads[0].filters, [['menu_id', MENU], ['user_id', USER]]);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});
for (const level of [0, 8, 1.5, '7', true, null]) test(`visitor rating rejects invalid scale ${String(level)}`, async () => {
  const h = harness(); assert.equal((await h.request('POST', {menuId: MENU, level})).status, 400); assert.equal(h.calls.length, 0);
});
test('anonymous, foreign-origin and missing-origin writes never mutate', async () => {
  const guest = harness({signedIn: false}); assert.equal((await guest.request('POST', {menuId: MENU, level: 7})).status, 401); assert.equal(guest.calls.length, 0);
  for (const origin of [null, 'https://foreign.example']) {
    const h = harness(); assert.equal((await h.request('POST', {menuId: MENU, level: 7}, {origin})).status, 403); assert.equal(h.calls.length, 0);
  }
});
test('consumer rating cannot specify another user and is unavailable on RICH and SWEET', async () => {
  const forged = harness(); assert.equal((await forged.request('POST', {menuId: MENU, level: 7, userId: OTHER})).status, 400); assert.equal(forged.calls.length, 0);
  for (const host of ['rich.nowgo.space', 'sweet.nowgo.space']) {
    const h = harness(); assert.equal((await h.request('POST', {menuId: MENU, level: 7}, {host})).status, 404);
    assert.equal((await h.request('GET', null, {host})).status, 404); assert.equal(h.calls.length, 0);
  }
});
test('unknown canonical menu, malformed bodies and large bodies are rejected before writing', async () => {
  const missing = harness({missing: true}); assert.equal((await missing.request('POST', {menuId: MENU, level: 7})).status, 404);
  assert.ok(!missing.calls.some(c => c.name === 'hot_menu_spice_upsert'));
  for (const body of ['{', 'null', '[]', '"x"', JSON.stringify({menuId: '------------------------------------', level: 7})]) {
    const h = harness(); assert.equal((await h.request('POST', body)).status, 400); assert.equal(h.calls.length, 0);
  }
  const h = harness(); assert.equal((await h.request('POST', 'x'.repeat(1025))).status, 413); assert.equal(h.calls.length, 0);
});
test('save readback mismatch is never reported as successful and database errors stay private', async () => {
  const mismatch = harness({savedLevel: 6}); const result = await mismatch.request('POST', {menuId: MENU, level: 7});
  assert.equal(result.status, 503); assert.equal(result.body.code, 'SAVE_UNVERIFIED'); assert.notEqual(result.body.saved, true);
  const error = harness({writeError: {message: 'private-database-detail'}}); const failed = await error.request('POST', {menuId: MENU, level: 7});
  assert.equal(failed.status, 503); assert.doesNotMatch(JSON.stringify(failed.body), /private-database/); assert.equal(error.reads.length, 0);
});
test('public summary exposes only the canonical aggregate, authenticated reads only their own rating', async () => {
  const guest = harness(); const publicResult = await guest.request('GET');
  assert.deepEqual(publicResult.body, {menuId: MENU, median: 3.5, count: 4, provisional: false, myLevel: null}); assert.equal(guest.reads.length, 0);
  const own = harness({own: {level: 6}}); const ownResult = await own.request('GET', null, {auth: true});
  assert.equal(ownResult.body.myLevel, 6); assert.deepEqual(own.reads[0].filters, [['menu_id', MENU], ['user_id', USER]]);
});
test('missing database summary and malformed aggregates never become an empty healthy result', async () => {
  for (const summary of [{median_level: 7, rating_count: 0}, {median_level: 8, rating_count: 1}, {median_level: 3.5, rating_count: 1}, {median_level: null, rating_count: 4}, {median_level: 5, rating_count: '1garbage'}, {median_level: 5, rating_count: -1}]) {
    const h = harness({summary}); assert.equal((await h.request('GET')).status, 503);
  }
  const db = harness({summaryError: {message: 'private'}}); assert.equal((await db.request('GET')).status, 503);
  const empty = harness({summary: {median_level: null, rating_count: 0}}); assert.equal((await empty.request('GET')).body.count, 0);
});
test('summary parser rejects another menu and forged provisional state', () => {
  const valid = {menuId: MENU, median: 7, count: 1, provisional: true, myLevel: null};
  assert.equal(spice.parseSpiceSummary(valid, MENU).median, 7);
  for (const patch of [{menuId: OTHER}, {provisional: false}, {myLevel: 8}, {count: Number.MAX_SAFE_INTEGER + 1}])
    assert.throws(() => spice.parseSpiceSummary({...valid, ...patch}, MENU));
});
test('HOT six and seven remain visible and accessible; other planets retain their five-point scale', () => {
  const {default: Detail} = load('components/detail-taste-price.tsx', {'react/jsx-runtime': jsx, '@/lib/menus': menus});
  for (const level of [6, 7]) {
    const html = renderToStaticMarkup(React.createElement(Detail, {variant: 'hot', level, price: 8000, isDemo: false, verifiedOwner: true}));
    assert.match(html, new RegExp('HOT ' + level + '단계')); assert.ok(html.includes(level + '/7')); assert.match(html, /공식 점주 제보 가격/);
  }
  for (const variant of ['rich', 'sweet']) {
    const html = renderToStaticMarkup(React.createElement(Detail, {variant, level: 5, price: 8000, isDemo: false}));
    assert.ok(html.includes(variant.toUpperCase() + ' 5단계')); assert.doesNotMatch(html, /\/7/);
  }
});
