import assert from "node:assert/strict";
import { test } from "node:test";
import { isSpiceLevel, spiceMedian, summarizeMenuSpiceRatings, type MenuSpiceRating } from "./hot-spice.ts";

test("spice levels only allow 1 through 7 integers", () => {
  assert.equal(isSpiceLevel(1), true);
  assert.equal(isSpiceLevel(7), true);
  for (const value of [0, 8, 9, 3.5, "7", null, NaN]) {
    assert.equal(isSpiceLevel(value), false);
  }
});

test("median supports odd, even and empty evaluations", () => {
  assert.equal(spiceMedian([]), null);
  assert.equal(spiceMedian([7]), 7);
  assert.equal(spiceMedian([2, 3, 3, 5, 7]), 3);
  assert.equal(spiceMedian([3, 4]), 3.5);
  assert.equal(spiceMedian([6, 7]), 6.5);
  assert.throws(() => spiceMedian([8]), RangeError);
});

test("latest valid rating per user and per menu", () => {
  const records = [
    { menuId: "a", userId: "u1", level: 3, updatedAt: "2026-10-01T00:00:00Z" },
    { menuId: "a", userId: "u1", level: 7, updatedAt: "2026-10-02T00:00:00Z" },
    { menuId: "a", userId: "u2", level: 6, updatedAt: "2026-10-01T00:00:00Z" },
    { menuId: "a", userId: "u3", level: 1, updatedAt: "2026-10-01T00:00:00Z", valid: false },
    { menuId: "a", userId: "u4", level: 8, updatedAt: "2026-10-01T00:00:00Z" },
    { menuId: "b", userId: "u3", level: 1, updatedAt: "2026-10-01T00:00:00Z" },
  ];
  assert.deepEqual(summarizeMenuSpiceRatings("a", records), {
    median: 6.5,
    count: 2,
    provisional: true,
  });
  assert.deepEqual(summarizeMenuSpiceRatings("b", records), {
    median: 1,
    count: 1,
    provisional: true,
  });
  assert.deepEqual(summarizeMenuSpiceRatings("c", records), {
    median: null,
    count: 0,
    provisional: false,
  });
});

test("invalid validity flags and user identities cannot influence a menu median", () => {
  const updatedAt = "2026-10-17T00:00:00Z";
  const records = [
    { menuId: "a", userId: "u1", level: 7, updatedAt, valid: true },
    { menuId: "a", userId: "u2", level: 1, updatedAt, valid: "false" },
    { menuId: "a", userId: "u3", level: 1, updatedAt, valid: null },
    { menuId: "a", userId: "  ", level: 1, updatedAt },
    { menuId: "a", userId: 42, level: 1, updatedAt },
    { menuId: "a", userId: " u4 ", level: 1, updatedAt },
  ] as unknown as MenuSpiceRating[];
  assert.deepEqual(summarizeMenuSpiceRatings("a", records), {
    median: 7,
    count: 1,
    provisional: true,
  });
});

test("exactly three valid distinct ratings yield a non-provisional median", () => {
  const updatedAt = "2026-10-17T00:00:00Z";
  assert.deepEqual(summarizeMenuSpiceRatings("a", [
    { menuId: "a", userId: "u1", level: 1, updatedAt },
    { menuId: "a", userId: "u2", level: 3, updatedAt, valid: true },
    { menuId: "a", userId: "u3", level: 7, updatedAt },
    { menuId: "a", userId: "u3", level: 5, updatedAt: "2026-10-16T00:00:00Z" },
  ]), { median: 3, count: 3, provisional: false });
});
