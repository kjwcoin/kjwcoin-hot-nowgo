import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';

const fixture = {id: 'preview-fixture-1', name: '예시 매장'};
const moduleUrl = new URL('../components/preview-regular-controls.tsx', import.meta.url);
const source = fs.readFileSync(moduleUrl, 'utf8');
const styles = new Proxy({}, {get: (_, name) => String(name)});

function load(url, dependencies) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(url, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
 }).outputText;
 vm.runInNewContext(code, {
  exports,
  require(name) {
   assert.ok(name in dependencies, `Unexpected import in preview: ${name}`);
   return dependencies[name];
  },
 });
 return exports;
}

const model = load(new URL('../lib/activity/model.ts', import.meta.url), {});
const CharacterArt = load(new URL('../components/activity/character-art.tsx', import.meta.url), {
 'react/jsx-runtime': jsxRuntime,
}).default;

function component(react = React) {
 return load(moduleUrl, {
  react,
  'react/jsx-runtime': jsxRuntime,
  './activity/character-art': {default: CharacterArt},
  '@/lib/activity/model': model,
  './regular-favorite.module.css': {default: styles},
  './preview-regular-controls.module.css': {default: styles},
 }).default;
}

function nodes(node) {
 if (node == null || typeof node !== 'object') return [];
 if (Array.isArray(node)) return node.flatMap(nodes);
 return [node, ...nodes(node.props?.children)];
}

function textOf(node) {
 if (node == null || typeof node === 'boolean') return '';
 if (typeof node !== 'object') return String(node);
 if (Array.isArray(node)) return node.map(textOf).join('');
 return textOf(node.props?.children);
}

function app(initialSaved = false) {
 const cells = [];
 let cursor = 0;
 let saved = initialSaved;
 let toggleCalls = 0;
 let focusCalls = 0;
 const hooks = {
  ...React,
  useState(initial) {
   const index = cursor++;
   if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
   return [cells[index], value => {cells[index] = typeof value === 'function' ? value(cells[index]) : value;}];
  },
  useId() {return 'preview-test-panel';},
  useRef(initial) {
   const index = cursor++;
   if (!(index in cells)) cells[index] = {current: initial};
   return cells[index];
  },
 };
 const Controls = component(hooks);
 return {
  get saved() {return saved;},
  get toggleCalls() {return toggleCalls;},
  get focusCalls() {return focusCalls;},
  render(store = fixture) {
   cursor = 0;
   const tree = Controls({store, saved, onToggle() {saved = !saved; toggleCalls++;}});
   const elements = nodes(tree);
   const manager = elements.find(node => node.props['aria-controls']);
   manager.props.ref.current = {focus() {focusCalls++;}};
   return {
    tree,
    elements,
    manager,
    toggle: elements.find(node => 'aria-pressed' in node.props),
    panel: elements.find(node => node.props.id === 'preview-test-panel'),
    button(label) {return elements.find(node => node.type === 'button' && textOf(node) === label);},
   };
  },
 };
}

test('favorite and list-management actions are adjacent buttons with explicit local-only copy', () => {
 const view = app().render();
 const actions = view.elements.find(node => node.props.className === 'actions');
 assert.deepEqual(React.Children.toArray(actions.props.children).map(textOf), ['♡ 단골등록', '내 단골리스트 관리']);
 assert.equal(view.toggle.props['aria-pressed'], false);
 assert.equal(view.manager.props['aria-expanded'], false);
 assert.equal(view.panel, undefined);
 assert.match(textOf(view.tree), /실제 내 단골 목록에는 저장되지 않으며 새로고침하면 초기화됩니다/);
});

test('register, unregister, and register again update only the parent favorite flag', () => {
 const state = app();
 state.render().toggle.props.onClick();
 assert.equal(state.saved, true);
 assert.equal(textOf(state.render().toggle), '♥ 단골등록됨 · 해제');
 state.render().toggle.props.onClick();
 assert.equal(state.saved, false);
 state.render().toggle.props.onClick();
 assert.equal(state.saved, true);
 assert.equal(state.toggleCalls, 3);
});

test('the unsaved list is honestly empty, and opening it does not register a favorite', () => {
 const state = app();
 state.render().manager.props.onClick();
 const view = state.render();
 assert.equal(view.manager.props['aria-expanded'], true);
 assert.match(textOf(view.panel), /이 미리보기에서 등록한 단골 매장이 없어요/);
 assert.equal(view.elements.some(node => node.type === 'li'), false);
 assert.equal(state.toggleCalls, 0);
});

test('the saved list contains only the current local fixture', () => {
 const state = app(true);
 state.render().manager.props.onClick();
 const rows = state.render().elements.filter(node => node.type === 'li');
 assert.equal(rows.length, 1);
 assert.equal(rows[0].props['data-preview-store-id'], fixture.id);
 assert.match(textOf(rows[0]), /예시 매장/);
 assert.match(textOf(state.render().panel), /현재 보고 있는 예시 매장만 관리할 수 있어요/);
});

test('removing a list entry calls the same parent toggle and immediately empties the panel', () => {
 const state = app(true);
 state.render().manager.props.onClick();
 const remove = state.render().button('단골 해제');
 assert.equal(remove.props['aria-label'], `${fixture.name} 단골 해제`);
 remove.props.onClick();
 const view = state.render();
 assert.equal(state.saved, false);
 assert.equal(state.toggleCalls, 1);
 assert.equal(view.toggle.props['aria-pressed'], false);
 assert.match(textOf(view.panel), /등록한 단골 매장이 없어요/);
 assert.equal(view.button('단골 해제'), undefined);
});

test('close and reopen preserve the current local favorite and do not invoke its callback', () => {
 const state = app(true);
 state.render().manager.props.onClick();
 state.render().button('닫기').props.onClick();
 assert.equal(state.render().panel, undefined);
 assert.equal(state.focusCalls, 1);
 state.render().manager.props.onClick();
 assert.equal(state.render().elements.filter(node => node.type === 'li').length, 1);
 assert.equal(state.toggleCalls, 0);
 assert.equal(state.saved, true);
});

test('clicking the disclosure a second time closes the list without hidden writes', () => {
 const state = app();
 state.render().manager.props.onClick();
 state.render().manager.props.onClick();
 assert.equal(state.render().panel, undefined);
 assert.equal(state.toggleCalls, 0);
});

test('Escape closes the panel, returns focus, and leaves the favorite untouched', () => {
 const state = app(true);
 let prevented = 0;
 let stopped = 0;
 state.render().manager.props.onClick();
 state.render().tree.props.onKeyDown({key: 'Escape', preventDefault() {prevented++;}, stopPropagation() {stopped++;}});
 assert.equal(state.render().panel, undefined);
 assert.equal(state.saved, true);
 assert.equal(state.toggleCalls, 0);
 assert.equal(state.focusCalls, 1);
 assert.equal(prevented, 1);
 assert.equal(stopped, 1);
});

test('unrelated keys and Escape on a closed panel have no side effects', () => {
 const state = app();
 const event = key => ({key, preventDefault() {assert.fail('Unexpected cancellation');}, stopPropagation() {assert.fail('Unexpected propagation change');}});
 state.render().tree.props.onKeyDown(event('Escape'));
 state.render().manager.props.onClick();
 state.render().tree.props.onKeyDown(event('Enter'));
 assert.ok(state.render().panel);
 assert.equal(state.focusCalls, 0);
 assert.equal(state.toggleCalls, 0);
});

test('a fresh preview starts unsaved instead of recovering a fake personal list', () => {
 const state = app();
 state.render().toggle.props.onClick();
 const fresh = app();
 assert.equal(fresh.render().toggle.props['aria-pressed'], false);
 fresh.render().manager.props.onClick();
 assert.match(textOf(fresh.render().panel), /등록한 단골 매장이 없어요/);
});

test('account values are unresolved and the existing character is explicitly an illustration', () => {
 const Controls = component();
 const html = renderToStaticMarkup(React.createElement(Controls, {store: fixture, saved: false, onToggle() {assert.fail('Unexpected write during render');}}));
 assert.match(html, /내 계정 · 미리보기/);
 assert.match(html, /레벨·EXP는 로그인한 내 ID 기준으로 표시됩니다/);
 assert.equal((html.match(/로그인 후 확인/g) ?? []).length, 2);
 assert.match(html, /탐험가 · 캐릭터 미리보기/);
 assert.match(html, /characters-growth\.webp/);
 assert.match(html, /background-position:0% 0%/);
 assert.match(html, /내 계정의 캐릭터·보유 등급을 나타내지 않습니다/);
 assert.doesNotMatch(html, /0 EXP|Lv\. ?1|나의 탐험가|customer-id|<a\b/);
});

test('each mounted list disclosure has a unique panel target', () => {
 const Controls = component();
 const html = renderToStaticMarkup(React.createElement('div', {}, [1, 2].map(id => React.createElement(Controls, {key: id, store: fixture, saved: false, onToggle() {}}))));
 const ids = Array.from(html.matchAll(/aria-controls="([^"]+)"/g), match => match[1]);
 assert.equal(ids.length, 2);
 assert.equal(new Set(ids).size, 2);
});

test('a preview without the optional parent callback disables mutations explicitly', () => {
 const Controls = component();
 const html = renderToStaticMarkup(React.createElement(Controls, {store: fixture, saved: false}));
 assert.match(html, /aria-pressed="false" disabled=""/);
 assert.match(html, /이 화면에서는 단골등록 변경을 사용할 수 없어요/);
 assert.match(html, /내 단골리스트 관리/);
});

test('the preview has no live integration, persistence, XP mutation, or history dependencies', () => {
 assert.doesNotMatch(source, /fetch\s*\(|localStorage|sessionStorage|indexedDB|document\.cookie|history\.|window\.|location\.|useActivity|RegularHomeLink|supabase|\/api\/|postAppEvent|awardXp/i);
 assert.equal(fs.existsSync(new URL('../public/activity/characters-growth.webp', import.meta.url)), true);
 const css = fs.readFileSync(new URL('../components/preview-regular-controls.module.css', import.meta.url), 'utf8');
 assert.match(css, /background-size:500% 300%/);
});
