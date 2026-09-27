import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePublicConfig} from '../lib/auth-config.ts';

test('missing flavor deployment settings use the unified NOWGO public project', () => {
  const config = resolvePublicConfig();
  assert.equal(config.url, 'https://tdkjdukblopypgoecuhh.supabase.co');
  assert.ok(config.key.startsWith('sb_publishable_'));
  assert.equal(config.ready, true);
});

test('an explicitly configured project never receives another project’s fallback key', () => {
  assert.equal(resolvePublicConfig('https://development.supabase.co').ready, false);
  assert.equal(resolvePublicConfig('https://development.supabase.co', 'public-development-key').key, 'public-development-key');
});

test('normalizes whitespace and the canonical project trailing slash', () => {
  assert.deepEqual(resolvePublicConfig(' https://tdkjdukblopypgoecuhh.supabase.co/ ', ' '), resolvePublicConfig());
});
