import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';

const returnTo = '/p/source-store-0123456789abcdef';
function load(path, dependencies) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
 }).outputText;
 vm.runInNewContext(code, {exports, require(name) {assert.ok(name in dependencies, 'Unexpected import: ' + name); return dependencies[name];}});
 return exports;
}
const model = load('lib/activity/model.ts', {});
const CharacterArt = load('components/activity/character-art.tsx', {'react/jsx-runtime': jsxRuntime}).default;
const source = fs.readFileSync(new URL('../components/source-account-character.tsx', import.meta.url), 'utf8');
function moduleWith(useActivity = () => {throw Error('Pure view must not start activity or auth');}) {
 return load('components/source-account-character.tsx', {
  'react/jsx-runtime': jsxRuntime,
  './activity/use-activity': {useActivity},
  './activity/character-art': {default: CharacterArt},
  '@/lib/activity/model': model,
  './source-account-character.module.css': {default: {}},
 });
}
const {SourceAccountCharacterView: View} = moduleWith();
const snapshot = (xp = 500, name = '내 불꽃이') => ({
 ...model.emptySnapshot('hot'), xp,
 profile: {nickname: '비공개 이름', character_id: null, character_name: name, equipped_badge: null},
});
const state = overrides => ({signedIn: true, owner: false, error: '', data: snapshot(), ...overrides});
const render = (value, path = returnTo) => renderToStaticMarkup(React.createElement(View, {state: value, returnTo: path}));
const noPersonal = html => {
 assert.doesNotMatch(html, /내 불꽃이|비공개 이름|500 EXP|characters-growth|레벨<\/dt><dd>5|캐릭터 미리보기|0 EXP/);
};

test('verified customer snapshot renders the actual character label, earned level, and EXP', () => {
 const html = render(state());
 assert.match(html, /내 불꽃이/);
 assert.match(html, /500 EXP/);
 assert.match(html, /캐릭터 등급<\/dt><dd>성주/);
 assert.match(html, /레벨<\/dt><dd>5/);
 assert.match(html, /background-position:50% 0%/);
 assert.match(html, /로그인한 내 ID의 캐릭터·레벨·EXP입니다/);
 assert.doesNotMatch(html, /로그인 상태 확인|비공개 이름|미리보기/);
});

test('a saved character selection comes only from the authenticated snapshot', () => {
 const data = snapshot();
 data.profile.character_id = 1;
 assert.match(render(state({data})), /background-position:25% 0%/);
});

test('an unnamed character uses its real EXP-derived rank without inventing a personal name', () => {
 const html = render(state({data: snapshot(180, '  ')}));
 assert.match(html, /<figcaption>기사<\/figcaption>/);
 assert.match(html, /180 EXP/);
 assert.doesNotMatch(html, /나의 탐험가|내 불꽃이/);
});

test('real server-confirmed zero EXP is displayed, but a missing snapshot never becomes zero', () => {
 assert.match(render(state({data: snapshot(0)})), /0 EXP/);
 const missing = render(state({data: null}));
 assert.match(missing, /확인 중/);
 noPersonal(missing);
});

test('logged-out state hides any stale snapshot and offers login returning to the exact HOT store path', () => {
 const html = render(state({signedIn: false, owner: null}));
 noPersonal(html);
 assert.match(html, /로그인 후 확인/);
 assert.match(html, new RegExp('/account/join\\?type=user&amp;returnTo=' + encodeURIComponent(returnTo)));
});

test('pending session and pending owner verification hide stale customer data', () => {
 for (const pending of [state({signedIn: null, owner: null}), state({owner: null})]) {
  const html = render(pending);
  noPersonal(html);
  assert.match(html, /내 계정의 캐릭터 정보를 확인하고 있어요/);
 }
});

test('verified owner state stays outside customer progression and links to owner management', () => {
 const html = render(state({owner: true}));
 noPersonal(html);
 assert.match(html, /점주 계정에는 고객 캐릭터·EXP를 표시하지 않아요/);
 assert.match(html, /href="\/owner"/);
 assert.doesNotMatch(html, /account\/join|내 단골/);
});

test('an account error masks even a populated snapshot and never renders server error text', () => {
 const html = render(state({error: 'private backend failure identifier'}));
 noPersonal(html);
 assert.match(html, /role="alert"/);
 assert.match(html, /확인 불가/);
 assert.doesNotMatch(html, /private backend/);
});

test('unknown, invalid, wrong-planet, and incomplete account values fail closed', () => {
 const bad = [NaN, Infinity, -1, 1.5, '500', undefined, Number.MAX_SAFE_INTEGER + 1];
 for (const xp of bad) {
  const html = render(state({data: {...snapshot(), xp}}));
  noPersonal(html);
  assert.match(html, /확인 불가/);
 }
 for (const patch of [{planet: 'sweet'}, {profile: null}, {profile: {}}, {profile: {...snapshot().profile, character_id: 9}}, {profile: {...snapshot().profile, character_id: -1}}]) {
  const html = render(state({data: {...snapshot(), ...patch}}));
  noPersonal(html);
  assert.match(html, /확인 불가/);
 }
});

test('unsafe return paths cannot become redirects or account links off HOT', () => {
 for (const path of ['https://evil.example/p/store', '//evil.example', '/p/../owner', '/p/store?returnTo=//evil.example', '/p/store#x', '/p/%2f%2fevil.example', '/p/store/child', '/p/store\\evil', '/p/store\n', '/p/store\r', '/p/store\t', '/activity']) {
  const html = render(state({signedIn: false}), path);
  assert.match(html, /returnTo=%2F"/);
  assert.doesNotMatch(html, /evil\.example|%3F|%23|%25/);
 }
});

test('profile labels are escaped instead of interpreted as markup', () => {
 const html = render(state({data: snapshot(500, '<img src=x onerror=alert(1)>')}));
 assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html, /<img src=x/);
});

test('providing existing activity state never mounts another activity hook', () => {
 let calls = 0;
 const {default: Component} = moduleWith(() => {calls++; return state();});
 const html = renderToStaticMarkup(React.createElement(Component, {state: state(), returnTo}));
 assert.match(html, /500 EXP/);
 assert.equal(calls, 0);
});

test('standalone wrapper invokes only the existing HOT activity hook', () => {
 const planets = [];
 const {default: Component} = moduleWith(planet => {planets.push(planet); return state();});
 renderToStaticMarkup(React.createElement(Component, {returnTo}));
 assert.deepEqual(planets, ['hot']);
 assert.doesNotMatch(source, /fetch\s*\(|browserDb|ensureUnifiedSession|activityAction|localStorage|sessionStorage|\.rpc\(|signOut\(|signIn\(|postAppEvent/);
});

function activityHarness({session: initialSession, role, getSnapshot}) {
 const cells = [];
 let cursor = 0;
 let session = initialSession;
 const calls = [];
 const hook = load('components/activity/use-activity.ts', {
  react: {
   useState(initial) {const index = cursor++; if (!(index in cells)) cells[index] = initial; return [cells[index], value => {cells[index] = value;}];},
   useRef(initial) {const index = cursor++; if (!(index in cells)) cells[index] = {current: initial}; return cells[index];},
   useCallback(fn) {return fn;}, useEffect() {},
  },
  '@/lib/supabase-browser': {browserDb: () => ({auth: {getSession: async () => ({data: {session}})}})},
  '@/lib/client': {async api(path) {const id = session?.user.id; calls.push([path, id]); return path.endsWith('/login-target') ? await role(id) : await getSnapshot(id);}},
 }).useActivity;
 return {
  calls, setSession(value) {session = value;},
  state() {cursor = 0; return hook('hot');},
 };
}
const sessionFor = id => ({user: {id, is_anonymous: false}});
const settle = async () => {for (let i = 0; i < 8; i++) await Promise.resolve();};

test('account switch immediately clears account A while B verification is pending', async () => {
 let resolveB;
 const harness = activityHarness({session: sessionFor('A'), role: id => id === 'B' ? new Promise(resolve => {resolveB = resolve;}) : {existingOwner: false}, getSnapshot: async id => snapshot(id === 'A' ? 500 : 180, id === 'A' ? 'A의 캐릭터' : 'B의 캐릭터')});
 await harness.state().refresh();
 assert.match(render(harness.state()), /A의 캐릭터/);
 harness.setSession(sessionFor('B'));
 const pending = harness.state().refresh();
 await settle();
 assert.equal(harness.state().data, null);
 assert.equal(harness.state().owner, null);
 assert.doesNotMatch(render(harness.state()), /A의 캐릭터|500 EXP/);
 resolveB({existingOwner: false});
 await pending;
 assert.match(render(harness.state()), /B의 캐릭터/);
 assert.match(render(harness.state()), /180 EXP/);
});

test('late account A snapshot cannot overwrite a completed account B session', async () => {
 let resolveA;
 const harness = activityHarness({session: sessionFor('A'), role: async () => ({existingOwner: false}), getSnapshot: id => id === 'A' ? new Promise(resolve => {resolveA = resolve;}) : snapshot(180, 'B의 캐릭터')});
 const pendingA = harness.state().refresh();
 await settle();
 harness.setSession(sessionFor('B'));
 await harness.state().refresh();
 resolveA(snapshot(500, 'A의 캐릭터'));
 await pendingA;
 const html = render(harness.state());
 assert.match(html, /B의 캐릭터/);
 assert.doesNotMatch(html, /A의 캐릭터|500 EXP/);
});

test('signout clears real values and late snapshots cannot restore them', async () => {
 let resolve;
 const harness = activityHarness({session: sessionFor('A'), role: async () => ({existingOwner: false}), getSnapshot: () => new Promise(done => {resolve = done;})});
 const pending = harness.state().refresh();
 await settle();
 harness.setSession(null);
 await harness.state().refresh();
 resolve(snapshot());
 await pending;
 noPersonal(render(harness.state()));
 assert.equal(harness.state().signedIn, false);
 assert.equal(harness.state().data, null);
});

test('role verification failure blocks snapshots; verified owners never request customer snapshots', async () => {
 for (const role of [async () => {throw Error('verification failed');}, async () => ({existingOwner: true})]) {
  const harness = activityHarness({session: sessionFor('A'), role, getSnapshot() {assert.fail('Customer snapshot must not be read');}});
  await harness.state().refresh();
  assert.deepEqual(harness.calls.map(([path]) => path), ['/api/customer/login-target']);
  noPersonal(render(harness.state()));
 }
});


test('public source-only account panel does not mount snapshot initialization or invent account values',()=>{
 let calls=0;
 const {default:Component}=moduleWith(()=>{calls++;throw Error('No extra account call permitted')});
 const html=renderToStaticMarkup(React.createElement(Component,{returnTo,readOnly:true,state:state()}));
 assert.equal(calls,0);noPersonal(html);assert.match(html,/기존 내 계정 화면/);assert.match(html,/href="\/account"/);assert.doesNotMatch(html,/확인 중|로그인한 내 ID/);
});

test('account page opts HOT into the card and preserves the exact safe login return', () => {
 const account = fs.readFileSync(new URL('../app/account/page.tsx', import.meta.url), 'utf8');
 assert.match(account, /<CustomerPanel variant=\{variant\} showAccountCharacter=\{variant==='hot'\}\/>/);
 const html = render(state({signedIn: false, owner: null}), '/account');
 noPersonal(html);
 assert.match(html, /returnTo=%2Faccount/);
});

function renderPanel(accountState, props = {}) {
 const calls = [];
 const Null = () => null;
 const Panel = load('components/customer-panel.tsx', {
  react: React, 'react/jsx-runtime': jsxRuntime,
  './source-account-character': {SourceAccountCharacterView: View},
  './regular-home-link': {default: Null},
  'lucide-react': {UserRound: Null, LogOut: Null},
  '@/lib/supabase-browser': {browserDb: () => {throw Error('Rendering must not start extra auth');}},
  './customer-account.module.css': {default: {}},
  '@/components/ui/dialog': {Dialog: Null, DialogContent: Null, DialogTitle: Null, DialogDescription: Null},
  '@/components/ui/button': {Button: ({children}) => React.createElement('button', null, children)},
  '@/lib/activity/model': model,
  'next/dynamic': {default: () => Null},
  '@/components/activity/use-activity': {useActivity: planet => {calls.push(planet); return {...accountState, refresh: () => {throw Error('Rendering must not refresh');}};}},
  '@/components/activity/activity.css': {}, './activity/world-entry': {default: Null},
 }).default;
 return {html: renderToStaticMarkup(React.createElement(Panel, {variant: 'hot', showAccountCharacter: true, ...props})), calls};
}

test('account card consumes the single existing customer panel hook without extra reads', () => {
 const {html, calls} = renderPanel(state());
 assert.deepEqual(calls, ['hot']);
 assert.match(html, /내 불꽃이/);
 assert.match(html, /500 EXP/);
 assert.match(html, /레벨<\/dt><dd>5/);
});

test('integrated account card never exposes old values while signed out, switching, owner, or failed', () => {
 for (const status of [{signedIn: false, owner: null, data: null}, {signedIn: null, owner: null, data: null}, {owner: null, data: null}, {owner: true, data: null}, {error: 'unavailable', data: null}]) {
  const {html, calls} = renderPanel(state(status));
  noPersonal(html);
  assert.deepEqual(calls, ['hot']);
 }
});

test('other CustomerPanel placements and flavors keep the new card disabled', () => {
 for (const props of [{showAccountCharacter: false}, {variant: 'sweet'}, {variant: 'rich'}]) {
  const {html} = renderPanel(state(), props);
  assert.doesNotMatch(html, /내 계정 · 내 캐릭터|내 불꽃이|500 EXP|characters-growth/);
 }
});
