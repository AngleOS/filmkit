import assert from "node:assert/strict";
import { test } from "node:test";
import { gate, isLoop, seamTimes, step } from "../src/build/seam.js";

/** @param {number} level @param {number} [size] */
const frame = (level, size = 12) => Buffer.alloc(size, level);
/** @param {number} start @param {number} by @param {number} n */
const ramp = (start, by, n) => Array.from({ length: n }, (_, i) => frame(start + by * i));
/** @param {Buffer} f @param {number} n */
const still = (f, n = 9) => Array(n).fill(f);

test("a loop that holds still across its seam passes", () => {
  assert.deepEqual(gate(still(frame(40)), still(frame(40))), { ok: true, step: 0, median: 0, limit: 0.4 });
});

test("a cut at the seam fails", () => {
  assert.deepEqual(gate(still(frame(40)), still(frame(200))), { ok: false, step: 160, median: 0, limit: 0.4 });
});

test("motion that carries on across the seam passes", () => {
  // 2 levels a frame, and frame 0 is the step after the last frame
  assert.deepEqual(gate(ramp(20, 2, 9), ramp(2, 2, 9)), { ok: true, step: 2, median: 2, limit: 3 });
});

test("a seam jump over one and a half steps fails", () => {
  assert.deepEqual(gate(ramp(20, 2, 9), ramp(0, 2, 9)), { ok: false, step: 4, median: 2, limit: 3 });
});

test("small noise under the floor passes", () => {
  assert.equal(gate(still(frame(40)), [...still(frame(40), 8), Buffer.from([...Array(11).fill(40), 44])]).ok, true);
});

test("a step is the mean absolute change, between frames of one size", () => {
  assert.equal(step(Buffer.from([0, 10, 20]), Buffer.from([3, 4, 20])), 3);
  assert.throws(() => step(Buffer.alloc(3), Buffer.alloc(4)), /frames differ in size: 3 and 4 bytes/);
  assert.throws(() => gate([frame(0)], still(frame(0))), /two frames at each end/);
});

test("the seam frames are the first 9 and the last 9 at 30 fps, without the unrendered frame at the end", () => {
  const times = seamTimes(10);
  assert.deepEqual(times.slice(0, 3), ["0.000000", "0.033333", "0.066667"]);
  assert.deepEqual(times.slice(-2), ["9.933333", "9.966667"]);
  assert.equal(times.length, 18);
  assert.throws(() => seamTimes(0.5), /at least 0\.6 s/);
});

test("a root with data-loop is a loop, unless it says false", () => {
  assert.equal(isLoop({ "data-loop": "true" }), true);
  assert.equal(isLoop({ "data-loop": "" }), true);
  assert.equal(isLoop({ "data-loop": "false" }), false);
  assert.equal(isLoop({}), false);
});
