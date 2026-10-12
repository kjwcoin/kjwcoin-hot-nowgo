import assert from "node:assert/strict";
import { test } from "node:test";
import { isSpiceLevel, spiceMedian, summarizeMenuSpiceRatings } from "./hot-spice.ts";

test("spice levels only allow 1 through 8 integers", () => {
  assert.equal(isSpiceLevel(1), true);
  assert.equal(isSpiceLevel(7), true);
  assert.equal(isSpiceLevel(8), true);
  for (const value of [0, 9, 3.5, "8", null, NaN]) {
    assert.equal(isSpiceLevel(value), false);
  }
});

test("median supports odd, even, upper-bound and empty evaluations", () => {
  assert.equal(spiceMedian([]), null);
  assert.equal(spiceMedian([8]), 8);
  assert.equal(spiceMedian([2, 3, 3, 5, 8]), 3);
  assert.equal(spiceMedian([7, 8]), 7.5);
  assert.throws(() => spiceMedian([9]), RangeError);
});

test("latest valid rating per user and per menu", () => {
  const records = [
    { menuId: "a", userId: "u1", level: 3, updatedAt: "2026-10-01T00:00:00Z" },
    { menuId: "a", userId: "u1", level: 8, updatedAt: "2026-10-02T00:00:00Z" },
    { menuId: "a", userId: "u2", level: 5, updatedAt: "2026-10-01T00:00:00Z" },
    { menuId: "a", userId: "u3", level: 1, updatedAt: "2026-10-01T00:00:00Z", valid: false },
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
