import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { pool, slots } from "../src/pool.js";

const GB = 1024 ** 3;

test("slots: one per two cores and per 4 GB, at least one", () => {
  assert.equal(slots(8, 8 * GB), 2);
  assert.equal(slots(10, 32 * GB), 5);
  assert.equal(slots(4, 64 * GB), 2);
  assert.equal(slots(1, 2 * GB), 1);
});

test("pool runs at most `limit` at once and keeps the items' order", async () => {
  let running = 0;
  let most = 0;
  const results = await pool([30, 5, 20, 1, 10], 2, async (ms) => {
    most = Math.max(most, ++running);
    await setTimeout(ms);
    running--;
    return ms * 2;
  });
  assert.equal(most, 2);
  assert.deepEqual(results, [60, 10, 40, 2, 20]);
});
