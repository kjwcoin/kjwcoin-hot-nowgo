import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mergeChatMessages, CHAT_LIMIT} from '../lib/map-chat.ts';

const message = (id, variant = 'hot', created_at = '2026-10-09T03:00:00Z') => ({id, variant, created_at, user_id:'member', display_name:'탐험가', content:id});

test('room history and a live event merge without duplicate or cross-brand messages', () => {
  const saved = message('saved');
  const live = message('live', 'hot', '2026-10-09T03:00:01Z');
  assert.deepEqual(mergeChatMessages([live], [saved, live, message('other', 'sweet')], 'hot'), [saved, live]);
});

test('a long chat retains the latest 80 messages in stable chronological order', () => {
  const history = Array.from({length: CHAT_LIMIT + 20}, (_, index) => message(String(index).padStart(3,'0')));
  const rows = mergeChatMessages([], history.reverse(), 'hot');
  assert.equal(rows.length, CHAT_LIMIT);
  assert.equal(rows[0].id, '020');
  assert.equal(rows.at(-1).id, '099');
});
