import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sourceUi} from './helpers/source-ui-components.mjs';

const css = fs.readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const actionRules = css.split('/* HOT owner-request and report entries stay white with bold red labels. */')[1]
 ?.split('/* Light-gray unverified HOT icons')[0];
const iconRules = css.split('/* Light-gray unverified HOT icons retain a visible edge, without changing cards. */')[1]
 ?.split('/*')[0];

function luminance(hex) {
 const rgb = hex.match(/[a-f\d]{2}/gi).map(part => parseInt(part, 16) / 255)
  .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
 return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) {
 const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
 return (values[0] + .05) / (values[1] + .05);
}

test('primary HOT owner and report CTAs use white, bold brand-red labels with narrow-screen wrapping', () => {
 assert.ok(actionRules);
 for (const selector of ['[data-owner-join-request] > button:first-of-type', '#owner-information > button:first-of-type', '[data-source-readonly-action="report"] > button:first-of-type', '.source-preview-heat-open', '.source-heat-pending', '.explorer .explorer-report']) assert.ok(actionRules.includes(selector), selector);
 for (const declaration of ['background: #fff;', 'color: var(--brand-ink);', 'font-weight: 800;', 'min-height: 44px;', 'max-width: 100%;', 'white-space: normal;', 'overflow-wrap: anywhere;']) assert.ok(actionRules.includes(declaration), declaration);
 assert.match(actionRules, /:not\(:disabled\):hover/);
 assert.match(actionRules, /:focus-visible\s*\{\s*outline: 3px solid var\(--brand-ink\);/);
 assert.doesNotMatch(actionRules, /opacity:|display:|pointer-events:|content:|!important/);
 for (const rule of actionRules.split('}').filter(value => value.trim())) assert.ok(rule.trim().startsWith('body[data-theme="hot"]'), rule);
});

test('HOT-red labels meet normal-text contrast and light-gray source pins retain a contrasting edge', () => {
 const flavorCss = fs.readFileSync(new URL('../app/flavor-theme.css', import.meta.url), 'utf8');
 assert.match(flavorCss, /body\[data-theme="hot"\]\s*\{\s*--brand-ink:\s*#c93421;/);
 assert.ok(contrast('c93421', 'ffffff') >= 4.5);
 assert.ok(contrast('727c86', 'd9dde1') >= 3);
 assert.ok(contrast('727c86', 'ffffff') >= 3);
 assert.ok(luminance('d9dde1') > luminance('71777d'));
});

test('light-gray icon overrides target only HOT unverified individual icons', () => {
 assert.ok(iconRules);
 assert.match(iconRules, /body\[data-theme="hot"\] \.map-anchor--sourced:not\(\.map-anchor--sourced-verified\) \.map-source-pin/);
 assert.match(iconRules, /background: #d9dde1;/);
 assert.match(iconRules, /border-color: #727c86;/);
 assert.match(iconRules, /body\[data-theme="hot"\] \.map-anchor\.map-anchor--reported \.map-anchor-pin/);
 assert.match(iconRules, /filter: grayscale\(1\) contrast\(\.2\) brightness\(1\.7\) drop-shadow\(0 0 1px #606972\);/);
 assert.doesNotMatch(iconRules, /explorer-detail|menu-card|map-anchor-price|source-store-detail|data-theme="(?:rich|sweet)"/);
});

test('emphasized source-only entries retain pending disclosure and expose no submission form', () => {
 const ui = sourceUi();
 for (const kind of ['report', 'owner']) {
  const html = renderToStaticMarkup(React.createElement(ui.ReadonlyActions, {kind}));
  assert.match(html, /준비 중/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /<form|<input|<select|<textarea|href=/);
  if (kind === 'report') assert.match(html, /제보 등록·저장·집계는 아직 연결되지 않았어요/);
  else assert.match(html, /점주 연결 전에는 요청이나 신청이 접수되지 않아요/);
 }
});
