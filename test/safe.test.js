import assert from "node:assert/strict";
import { test } from "node:test";
import { safeBox, safeZone } from "../src/safe.js";

test("the safe box is the kit's own AL.safe in each format", () => {
  assert.deepEqual(safeBox("16x9"), { top: 54, right: 96, bottom: 54, left: 96 });
  assert.deepEqual(safeBox("9x16"), { top: 270, right: 120, bottom: 420, left: 64 });
  assert.deepEqual(safeBox("1x1"), { top: 64, right: 64, bottom: 64, left: 64 });
  assert.deepEqual(safeBox("4x5"), { top: 96, right: 64, bottom: 96, left: 64 });
});

const film = `<div id="root" data-composition-id="main" data-duration="9">
  <div id="hook" data-start="0" data-duration="3"></div>
  <div id="proof" data-start="hook" data-duration="6"></div>
  <div id="beat" data-start="2"></div>
</div>`;

test("the safe zone is the band under the safe box, sampled in each scene once it has settled", () => {
  assert.equal(safeZone(film, 9, "9x16"), "x0=0;y0=0.78125;x1=1;y1=1;seek=0.2222,0.7778");
  assert.equal(safeZone(film, 9, "16x9"), "x0=0;y0=0.95;x1=1;y1=1;seek=0.2222,0.7778");
});

test("a film without timed scenes is sampled two thirds in", () => {
  assert.equal(safeZone('<div id="root" data-composition-id="main"></div>', 6, "1x1"), `x0=0;y0=${1 - 64 / 1080};x1=1;y1=1;seek=0.6667`);
});
