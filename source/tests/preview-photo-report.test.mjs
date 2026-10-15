import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import * as runtime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {moduleAt, elements, textOf, hookHarness} from './helpers/source-ui-components.mjs';

const menus = [{id: 'source:menu:a', name: '매운 국수'}, {id: 'source:menu:b', name: '매운 국수'}];
const image = (type = 'image/png', size = 10) => new File([new Uint8Array(size)], 'photo.png', {type});
function load(react = React) {
  return moduleAt('components/preview-photo-report.tsx', {
    react, 'react/jsx-runtime': runtime,
    './preview-photo-report.module.css': {default: {root: 'photo-form-style'}},
  });
}
const {default: Component, validatePreviewPhoto: validate, PREVIEW_PHOTO_MAX_BYTES: maxBytes} = load();
const valid = overrides => ({menuId: menus[1].id, file: image(), nickname: '고추친구', ...overrides});

function setup(props = {}) {
  const hooks = hookHarness();
  const component = load({...hooks.react, useId: () => 'preview-photo-test'}).default;
  const calls = [];
  let resets = 0;
  const options = {store: {menus}, selectedMenuId: menus[1].id, onPreviewPhoto: (...args) => calls.push(args), onReset: () => resets++, ...props};
  const render = () => hooks.render(() => component(options));
  const field = name => elements(render()).find(node => node.props?.name === name);
  const button = name => elements(render()).find(node => node.type === 'button' && textOf(node) === name);
  const change = (name, value) => field(name).props.onChange({target: name === 'previewPhoto' ? {files: value ? [value] : []} : {value}});
  const submit = () => elements(render()).find(node => node.type === 'form').props.onSubmit({preventDefault() {}});
  return {calls, render, field, button, change, submit, resets: () => resets, options};
}

test('validator only accepts exact canonical menu IDs, never matching display names or whitespace', () => {
  for (const menuId of ['', '매운 국수', 'source:menu:c', ` ${menus[1].id}`]) {
    const result = validate(menus, valid({menuId}));
    assert.equal(result.ok, false);
    assert.equal(result.error.field, 'menu');
  }
  const file = image();
  const result = validate(menus, valid({file, nickname: '  고추친구  '}));
  assert.equal(result.ok, true);
  assert.equal(result.menuId, menus[1].id);
  assert.equal(result.file, file);
  assert.equal(result.nickname, '고추친구');
});

test('validator accepts JPEG/PNG/WebP up to exactly 5 MiB and rejects missing, empty, oversized or other files', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validate(menus, valid({file: image(type, maxBytes)})).ok, true);
  }
  for (const file of [null, image('image/png', 0), image('image/png', maxBytes + 1), image('image/svg+xml'), image('image/gif'), image('text/html'), image('')]) {
    const result = validate(menus, valid({file}));
    assert.equal(result.ok, false);
    assert.equal(result.error.field, 'file');
  }
});

test('public nickname is trimmed and 1–20 code points; raw email and telephone strings are rejected', () => {
  for (const nickname of ['', '   ', '가'.repeat(21), 'user@example.com', 'user@localhost', '010-1234-5678', '+82 10 1234 5678', '(02) 123-4567', 'tel:01012345678', '1234567890']) {
    const result = validate(menus, valid({nickname}));
    assert.equal(result.ok, false, nickname);
    assert.equal(result.error.field, 'nickname');
  }
  for (const nickname of ['가'.repeat(20), '🌶️친구', '😀'.repeat(20), '@맛친구', '매운맛123']) {
    assert.equal(validate(menus, valid({nickname})).ok, true, nickname);
  }
});

test('first render is a separate photo action with explicit local-only privacy explanation', () => {
  const html = renderToStaticMarkup(React.createElement(Component, {store: {menus}, onPreviewPhoto() {}}));
  assert.match(html, /사진 제보/);
  assert.match(html, /이 브라우저에서만/);
  assert.match(html, /저장·게시되지 않으며 초기화하거나 새로고침하면 사라져요/);
  assert.doesNotMatch(html, /<form|등록 완료|제보 완료|인증된|인증 완료/);
});

test('opening selects the canonical requested menu, invalid inputs never call the parent', () => {
  const h = setup();
  h.button('사진 제보').props.onClick();
  assert.equal(h.field('previewMenuId').props.value, menus[1].id);
  assert.equal(h.field('previewPhoto').props.accept, 'image/jpeg,image/png,image/webp');
  for (const file of [null, image('image/svg+xml'), image('image/png', maxBytes + 1)]) {
    h.change('previewPhoto', file);
    h.change('previewPublicNickname', '고추친구');
    h.submit();
    assert.equal(h.calls.length, 0);
    assert.ok(elements(h.render()).some(node => node.props?.role === 'alert'));
  }
  h.change('previewPhoto', image());
  h.change('previewPublicNickname', '  ');
  h.submit();
  assert.equal(h.calls.length, 0);
  h.change('previewPublicNickname', '고추친구');
  h.change('previewMenuId', '매운 국수');
  h.submit();
  assert.equal(h.calls.length, 0);
});

test('valid submission calls the parent once with exact menu, file and trimmed nickname, then closes honestly', () => {
  const h = setup();
  h.button('사진 제보').props.onClick();
  const file = image('image/webp');
  h.change('previewPhoto', file);
  h.change('previewPublicNickname', '  고추친구  ');
  const submit = elements(h.render()).find(node => node.type === 'form').props.onSubmit;
  submit({preventDefault() {}});
  submit({preventDefault() {}});
  assert.deepEqual(h.calls, [[menus[1].id, file, '고추친구']]);
  assert.equal(elements(h.render()).some(node => node.type === 'form'), false);
  const html = renderToStaticMarkup(h.render());
  assert.match(html, /미리보기에만 반영했어요/);
  assert.match(html, /저장하거나 게시하지 않았어요/);
  assert.doesNotMatch(html, /등록 완료|제보 완료|업로드 완료|인증된|인증 완료/);
});

test('typed nickname is escaped, remains ordinary text, and is not turned into a fake profile', () => {
  const h = setup();
  h.button('사진 제보').props.onClick();
  h.change('previewPublicNickname', '<img src=x>');
  const html = renderToStaticMarkup(h.render());
  assert.match(html, /value="&lt;img src=x&gt;"/);
  assert.doesNotMatch(html, /<img|data-verified|href=".*profile/);
  assert.match(html, /계정 인증이 아니에요/);
  h.change('previewPhoto', image());
  h.submit();
  assert.equal(h.calls[0][2], '<img src=x>');
});

test('cancel and close clear the draft, block stale submissions and do not delete an existing preview', () => {
  for (const action of ['취소', '사진 제보 닫기']) {
    const h = setup();
    h.button('사진 제보').props.onClick();
    h.change('previewPhoto', image());
    h.change('previewPublicNickname', '고추친구');
    const submit = elements(h.render()).find(node => node.type === 'form').props.onSubmit;
    h.button(action).props.onClick();
    submit({preventDefault() {}});
    assert.equal(h.calls.length, 0);
    assert.equal(h.resets(), 0);
    assert.equal(elements(h.render()).some(node => node.type === 'form'), false);
    h.button('사진 제보').props.onClick();
    assert.equal(h.field('previewPublicNickname').props.value, '');
    h.change('previewPublicNickname', '고추친구');
    h.submit();
    assert.equal(h.calls.length, 0);
  }
});

test('reset invokes only the parent reset, clears form state and permits a fresh preview', () => {
  const h = setup();
  h.button('사진 제보').props.onClick();
  h.change('previewPhoto', image());
  h.change('previewPublicNickname', '고추친구');
  const submit = elements(h.render()).find(node => node.type === 'form').props.onSubmit;
  h.button('사진 미리보기 초기화').props.onClick();
  submit({preventDefault() {}});
  assert.equal(h.resets(), 1);
  assert.equal(h.calls.length, 0);
  assert.match(textOf(h.render()), /초기화했어요/);
  h.button('사진 제보').props.onClick();
  h.change('previewPhoto', image());
  h.change('previewPublicNickname', '새친구');
  h.submit();
  assert.equal(h.calls.length, 1);
});

test('missing or stale selection requires a menu choice and an empty menu catalog disables opening', () => {
  for (const selectedMenuId of [undefined, null, 'old-menu']) {
    const h = setup({selectedMenuId});
    h.button('사진 제보').props.onClick();
    assert.equal(h.field('previewMenuId').props.value, '');
  }
  const empty = setup({store: {menus: []}});
  assert.equal(empty.button('사진 제보').props.disabled, true);
});

test('missing preview callback disables opening and cannot fabricate a successful preview', () => {
  const h = setup({onPreviewPhoto: undefined});
  assert.equal(h.button('사진 제보').props.disabled, true);
  h.button('사진 제보').props.onClick();
  assert.equal(elements(h.render()).some(node => node.type === 'form'), false);
  assert.match(textOf(h.render()), /사진 미리보기는 아직 연결되지 않았/);
  assert.doesNotMatch(textOf(h.render()), /미리보기에만 반영했어요/);
});

test('callback failure keeps form recoverable without claiming publication or preview success', () => {
  const h = setup({onPreviewPhoto() {throw new Error('Object URL unavailable');}});
  h.button('사진 제보').props.onClick();
  h.change('previewPhoto', image());
  h.change('previewPublicNickname', '고추친구');
  h.submit();
  assert.match(textOf(h.render()), /미리보기를 만들지 못했어요/);
  assert.doesNotMatch(textOf(h.render()), /미리보기에만 반영했어요|등록 완료/);
  assert.ok(elements(h.render()).some(node => node.type === 'form'));
});

test('implementation has no network, authentication, persistence, upload, innerHTML or object URL ownership', () => {
  const source = fs.readFileSync(new URL('../components/preview-photo-report.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(|\bapi\(|XMLHttpRequest|supabase|localStorage|sessionStorage|indexedDB|dangerouslySetInnerHTML|createObjectURL|revokeObjectURL|\/api\//);
});
