import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spiceMedian, summarizeMenuSpiceRatings } from './hot-spice.ts';

const vote = (menuId: string, userId: string, level: number, updatedAt: string, valid = true) =>
  ({ menuId, userId, level, updatedAt, valid });

test('8-stage endpoints and fractional median do not mutate caller input', () => {
  const levels = Object.freeze([8, 1, 2, 7]);
  assert.equal(spiceMedian(levels), 4.5);
  assert.deepEqual(levels, [8, 1, 2, 7]);
  assert.equal(spiceMedian([8, 8, 8]), 8);
  assert.equal(spiceMedian([1, 1]), 1);
});

test('only valid latest rating per user is counted, isolated by menu', () => {
  const votes = [
    vote('menu-a', 'u1', 2, '2026-10-11T00:00:00Z'),
    vote('menu-a', 'u1', 8, '2026-10-12T00:00:00Z'),
    vote('menu-a', 'u1', 1, '2026-10-13T00:00:00Z', false),
    vote('menu-a', 'u2', 2, '2026-10-12T00:00:00Z'),
    vote('menu-b', 'u3', 8, '2026-10-12T00:00:00Z'),
  ];
  assert.deepEqual(summarizeMenuSpiceRatings('menu-a', votes), { median: 5, count: 2, provisional: true });
  assert.deepEqual(summarizeMenuSpiceRatings('menu-b', votes), { median: 8, count: 1, provisional: true });
});

test('malformed dates and invalid levels cannot change median or population', () => {
  const votes = [
    vote('menu-a', 'u1', 8, '2026-10-10T00:00:00Z'),
    vote('menu-a', 'u2', 2, '2026-10-10T00:00:00Z'),
    vote('menu-a', 'u3', 1, 'not-a-date'),
    vote('menu-a', 'u4', 9, '2026-10-10T00:00:00Z'),
    vote('menu-a', 'u5', 2.5, '2026-10-10T00:00:00Z'),
    vote('menu-a', '', 1, '2026-10-10T00:00:00Z'),
  ];
  assert.deepEqual(summarizeMenuSpiceRatings('menu-a', votes), { median: 5, count: 2, provisional: true });
});

test('provisional ends at third distinct member, with even-sized median', () => {
  const votes = [
    vote('menu-a', 'u1', 1, '2026-10-10T00:00:00Z'),
    vote('menu-a', 'u2', 2, '2026-10-10T00:00:00Z'),
    vote('menu-a', 'u3', 8, '2026-10-10T00:00:00Z'),
    vote('menu-a', 'u4', 8, '2026-10-10T00:00:00Z'),
  ];
  assert.deepEqual(summarizeMenuSpiceRatings('menu-a', votes.slice(0, 3)), { median: 2, count: 3, provisional: false });
  assert.deepEqual(summarizeMenuSpiceRatings('menu-a', votes), { median: 5, count: 4, provisional: false });
  assert.deepEqual(summarizeMenuSpiceRatings('absent', votes), { median: null, count: 0, provisional: false });
});
