import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sourcePreviewStore} from '../lib/source-store-preview.ts';
import {sourceUi, elements, textOf, hookHarness} from './helpers/source-ui-components.mjs';

const original = sourcePreviewStore();
const store = {...original, registrationState: 'source-only', menus: [{...original.menus[0], sourceTaste: {
 description: '매콤한 양념에 비빈 국수', preparationTraits: ['매콤한 양념'], choiceOffered: true,
 sourceUrl: original.source.url, sourceAsOf: original.source.asOf, checkedAt: original.source.checkedAt,
 licenseName: original.source.licenseName, publicDisplayAllowed: true,
}}]};
const ui = sourceUi();
const detail = (value = store, props = {}, view = ui) => renderToStaticMarkup(React.createElement(view.Detail, {store: value, onBack() {}, ...props}));
const noLive = html => assert.doesNotMatch(html, /data-live-component|consumer-menu-heat|data-reporting-state="enabled"|\/owner\/claim|\/loyalty|\/suggestion#report|<form|<input|<select|단골저장됨|참여 고객 \d+명|중앙값 [0-9]|캐릭터 미리보기/);

test('source-only card preserves the HOT row and labels public-source status without changing its slots', () => {
 const html = renderToStaticMarkup(React.createElement(ui.Card, {store}));
 for (const expected of ['source-store-legacy-card', 'explorer-menu-item', 'explorer-item-copy', 'source-menu-photo', '공공자료 소개 · 점주 확인 전', '가격 미확인', '맵기 미확인', '사진 미등록']) assert.ok(html.includes(expected), expected);
 assert.match(html, /src="\/images\/nowgo-red.png"/);
 assert.match(html, /data-registration-state="source-only"/);
 assert.doesNotMatch(html, /공공자료 등록|점주 확인 · 공공자료 메뉴|0원|중앙값|고객 평가|grayscale/);
});

test('source-only detail keeps the legacy ordered slots with no store-bound live components', () => {
 const html = detail();
 const ordered = ['explorer-back', 'explorer-detail-photo', 'explorer-detail-content', 'explorer-tags', '<h1>', 'explorer-taste-price', 'store-status', 'data-source-readonly-action="favorite"', 'explorer-quick-actions', 'source-public-taste', 'source-detail-footer'];
 let cursor = -1;
 for (const marker of ordered) {const index = html.indexOf(marker); assert.ok(index > cursor, marker); cursor = index;}
 for (const expected of ['공공자료 소개 · 점주 확인 전', '공공자료의 맵기 설명', '고객 연결 준비 중', '맵기 미확인', '가격 미확인', '현재 메뉴 제공 여부 미확인', '방문 후 맛을 확인해 주세요', '직접 먹어보셨나요? 맵기 단계와 맛의 특징을 제보해 주세요!', '제보 등록·저장·집계는 아직 연결되지 않았어요', '점주 연결 전에는 요청이나 신청이 접수되지 않아요']) assert.ok(html.includes(expected), expected);
 assert.equal((html.match(/data-source-readonly-action=/g) || []).length, 3);
 noLive(html);
});

test('even an enabled reporting flag never mounts customer heat or store writers for source-only facts', () => {
 const html = detail({...store, reportingState: 'enabled', ownerClaimVerified: true});
 noLive(html);
 assert.match(html, /공공자료 소개 · 점주 확인 전/);
 const tree = ui.Detail({store: {...store, reportingState: 'enabled'}, onBack() {}});
 const types = elements(tree).map(node => node.type);
 for (const component of [ui.ConsumerHeat, ui.PreviewHeat, ui.PreviewPhoto, ui.PreviewRegular, ui.Actions]) assert.equal(types.includes(component), false);
 assert.equal(types.filter(type => type === ui.ReadonlyActions).length, 3);
});

test('the global regular manager is separate from unavailable source favorite and has no source identity', () => {
 const tree = ui.Detail({store, onBack() {}});
 const link = elements(tree).find(node => node.type === ui.RegularHomeLink);
 assert.ok(link);
 assert.equal(textOf(link), '내 단골 목록');
 assert.deepEqual(Object.keys(link.props).sort(), ['children', 'className', 'variant']);
 const html = detail();
 assert.match(html, /href="https:\/\/nowgo.space\/regular\/home\?flavor=hot"/);
 assert.doesNotMatch(html, /placeId=|storeId=|nowgo-fb31|방문 인증 확인/);
});

test('source-only does not auto-initialize an account or invent character/EXP values', () => {
 for(const accountState of [undefined,{signedIn:true,owner:false,error:'',data:{planet:'hot',xp:180,profile:{character_name:'진짜 캐릭터',character_id:1}}}]){
  const html=detail(store,{},sourceUi({accountState}));
  assert.match(html,/기존 내 계정 화면/);assert.match(html,/href="\/account"/);
  assert.doesNotMatch(html,/진짜 캐릭터|180 EXP|0 EXP|캐릭터 미리보기|나의 탐험가|확인 중/);noLive(html);
 }
});

test('source-only uses the exact selected menu description and distinguishes missing facts', () => {
 const missing = {...store.menus[0], id: store.sourceRef + ':menu:2', name: '다른 메뉴', sourceTaste: null};
 const html = detail({...store, menus: [...store.menus, missing]}, {menuId: missing.id});
 assert.match(html, /<h1>다른 메뉴<\/h1>/);
 assert.match(html, /공공자료에 확인 가능한 맵기 설명이 없어요/);
 assert.doesNotMatch(html, /매콤한 양념|맵기 선택 제공이 명시/);
 assert.match(detail(), /자료에 맵기 선택 제공이 명시되어 있어요/);
 assert.doesNotMatch(detail({...store, menus: [{...store.menus[0], sourceTaste: {...store.menus[0].sourceTaste, choiceOffered: false}}]}), /자료에 맵기 선택 제공이 명시/);
});

test('source-only unknown coordinates never invent navigation, reservation, or waiting availability', () => {
 const html = detail({...store, coordinates: null});
 assert.doesNotMatch(html, /map\.kakao\.com/);
 assert.match(html, /지도 위치 미확인/);
 assert.equal((html.match(/disabled=""/g) || []).length, 3);
 noLive(html);
});

test('source-only explanation panels support repeated clicks, switching and Close without implying saved state', () => {
 for (const kind of ['favorite', 'report', 'owner']) {
  const harness = hookHarness();
  const {ReadonlyActions} = sourceUi({react: harness.react});
  const render = () => harness.render(() => ReadonlyActions({kind}));
  let focused = 0;
  const event = {currentTarget: {focus() {focused++;}}};
  let tree = render();
  const trigger = elements(tree).find(node => node.type === 'button');
  assert.equal(trigger.props['aria-expanded'], false);
  trigger.props.onClick(event); trigger.props.onClick(event); tree = render();
  assert.equal(elements(tree).filter(node => node.props?.role === 'status').length, 1);
  assert.equal(elements(tree).find(node => node.type === 'button').props['aria-expanded'], true);
  if (kind === 'favorite') assert.match(textOf(tree), /이 버튼으로 내 목록에 추가되지 않아요/);
  if (kind === 'report') {assert.match(textOf(tree), /지금은 입력하거나 저장할 수 없어요/); assert.match(textOf(tree), /기존 일반 제보는 화면의 제보 등록 메뉴에서 별도로 이용/);}
  if (kind === 'owner') {
   assert.match(textOf(tree), /요청을 접수하거나 요청 수를 집계하지 않아요/);
   elements(tree).find(node => node.type === 'button' && textOf(node).includes('소유권')).props.onClick(event);
   tree = render();
   assert.match(textOf(tree), /이 화면에서는 신청을 받지 않으며/);
   assert.doesNotMatch(textOf(tree), /요청을 접수하거나 요청 수를 집계하지 않아요/);
  }
  assert.doesNotMatch(textOf(tree), /저장했|저장됨|접수했|접수 완료|요청 \d+|0명|0회/);
  assert.equal(elements(tree).some(node => ['form', 'input', 'select', 'textarea', 'a'].includes(node.type)), false);
  elements(tree).find(node => node.type === 'button' && textOf(node) === '닫기').props.onClick();
  tree = render();
  assert.equal(focused, 1);
  assert.equal(elements(tree).some(node => node.props?.role === 'status'), false);
  elements(tree).find(node => node.type === 'button').props.onClick(event);
  tree = render();
  assert.equal(elements(tree).filter(node => node.props?.role === 'status').length, 1);
  let prevented = false;
  tree.props.onKeyDown({key: 'Escape', preventDefault() {prevented = true;}});
  assert.equal(prevented, true);
  assert.equal(focused, 2);
  assert.equal(elements(render()).some(node => node.props?.role === 'status'), false);
 }
});

test('the source-only action implementation has no auth, network, storage, navigation, or writer imports', () => {
 const source = fs.readFileSync(new URL('../components/source-readonly-actions.tsx', import.meta.url), 'utf8');
 assert.doesNotMatch(source, /fetch\s*\(|\bapi\s*\(|supabase|browserDb|localStorage|sessionStorage|\.rpc\s*\(|window\.|location\.|router\.|storeId|placeId|ConsumerMenuHeat|RegularFavorite|StoreOwnerJoinRequest|\/owner\/claim|\/suggestion/);
 assert.match(source, /setActive\(null\)/);
 assert.match(source, /role="status"/);
});

test('database-source behavior and interactive preview keep their original implementations', () => {
 const database = detail({...store, registrationState: 'database'});
 assert.match(database, /data-live-component="favorite"/);
 assert.match(database, /data-live-component="owner-request"/);
 assert.match(database, /\/owner\/claim\?storeId=/);
 assert.doesNotMatch(database, /data-source-readonly-action/);
 const preview = detail(store, {preview: true, previewPhoto: {url: 'blob:preview-photo', nickname: '내 닉네임'}, previewFavorite: true});
 assert.match(preview, /단골 · 계정 미리보기/);
 assert.match(preview, /blob:preview-photo/);
 assert.match(preview, /내 닉네임/);
 assert.match(preview, /미리보기 · 요청과 점주 신청은 저장되지 않아요/);
 assert.doesNotMatch(preview, /data-source-readonly-action|data-registration-state="source-only"|data-live-component/);
});

test('public-only styling never grays the HOT card or detail and keeps original responsive geometry', () => {
 const css = fs.readFileSync(new URL('../components/sourced-store-minihome.css', import.meta.url), 'utf8');
 const actions = fs.readFileSync(new URL('../components/source-readonly-actions.module.css', import.meta.url), 'utf8');
 assert.doesNotMatch(css + actions, /grayscale|filter\s*:|\.explorer-results\s*\{|source-minihome-columns/);
 assert.match(css, /source-menu-photo\{width:78px;height:84px/);
 assert.match(css, /@media\(max-width:700px\).*source-menu-photo\{width:64px;height:66px/);
 assert.match(css, /data-registration-state=source-only.*color:var\(--brand-ink/);
});
