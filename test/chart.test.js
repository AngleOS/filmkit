// The infographic scenes' value-to-geometry maths (kit/chart.js) and the chart box they sit in (AL.chart): bars to
// scale, numbers as the films print them, labels clear of lines, and every chart clear of the captions in each frame.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const kit = (file) => readFileSync(new URL(`../kit/${file}`, import.meta.url), "utf8");

/** kit/chart.js's KC, with a linear ease for its rolls. */
function chart() {
  const window = /** @type {any} */ ({ gsap: { parseEase: () => (/** @type {number} */ t) => t } });
  runInNewContext(kit("chart.js"), { window, ...window });
  return window.KC;
}

/** kit/layout.js's AL for a canvas, with gsap.set recording what it lays out. */
function layout(width, height) {
  /** @type {Map<any, any>} */
  const sets = new Map();
  const root = { dataset: { width: String(width), height: String(height) } };
  const window = /** @type {any} */ ({
    document: { querySelector: () => root, documentElement: { dataset: {} } },
    gsap: { set: (/** @type {any} */ el, /** @type {any} */ props) => sets.set(el, props) },
  });
  runInNewContext(kit("layout.js"), { window, ...window });
  return { AL: window.AL, sets };
}

const KC = chart();
/** A value from the kit's realm as this one's, so deepEqual compares its contents, not its prototypes. */
const plain = (/** @type {unknown} */ x) => JSON.parse(JSON.stringify(x));

test("values are drawn to scale against the largest, a reference line or a set top", () => {
  assert.deepEqual(plain(KC.lengths([12, 19, 26, 37], 370)), [120, 190, 260, 370]);
  assert.deepEqual(plain(KC.lengths([10, 20], 300, { ref: 40 })), [75, 150]);
  assert.deepEqual(plain(KC.lengths([28.7, 50], 1000, { max: 100 })), [287, 500]);
  assert.equal(KC.top([10, 20], { ref: 40 }), 40);
});

test("a small value still shows, and zero or less draws nothing", () => {
  assert.deepEqual(plain(KC.lengths([1, 1000, 0, -5], 500)), [4, 500, 0, 0]);
});

test("bands share the length evenly, centred in their slots and no thicker than asked", () => {
  assert.deepEqual(plain(KC.bands(4, 1200, { most: 150 })), [
    { start: 75, size: 150, centre: 150 },
    { start: 375, size: 150, centre: 450 },
    { start: 675, size: 150, centre: 750 },
    { start: 975, size: 150, centre: 1050 },
  ]);
  assert.equal(KC.bands(5, 500)[0].size, 62);
});

test("numbers print grouped, plain or compact, with a prefix, suffix and rounding", () => {
  assert.equal(KC.format(12480), "12,480");
  assert.equal(KC.format(2026, { format: "plain" }), "2026");
  assert.equal(KC.format(1234567.891, { decimals: 2 }), "1,234,567.89");
  assert.equal(KC.format(29.37, { prefix: "$", decimals: 1 }), "$29.4");
  assert.equal(KC.format(4_520_000, { format: "compact", decimals: 1 }), "4.5M");
  assert.equal(KC.format(1_200_000_000, { format: "compact", decimals: 1, prefix: "$" }), "$1.2B");
  assert.equal(KC.format(950, { format: "compact" }), "950");
  assert.equal(KC.format(-3.5, { suffix: "%", decimals: 1 }), "−3.5%");
});

test("a chart's rows are 'label: value' lines, split at the last colon", () => {
  assert.deepEqual(plain(KC.rows("2024/25: 28.92\n Ratio 3:1 : 4 \n\n")), [{ label: "2024/25", value: 28.92 }, { label: "Ratio 3:1", value: 4 }]);
});

test("the delta reads as a difference (percentages in points), a relative change or a multiple", () => {
  assert.equal(KC.delta(28.7, 50, "difference", { suffix: "%", decimals: 1 }), "+21.3 points");
  assert.equal(KC.delta(1200, 900, "difference", { prefix: "$" }), "−$300");
  assert.equal(KC.delta(1200, 3700, "percent"), "+208%");
  assert.equal(KC.delta(1200, 3700, "times"), "3.1×");
  assert.equal(KC.delta(5, 5, "difference"), "0");
});

test("type fits the longest label in its width, but never under 28 px", () => {
  assert.equal(KC.fit(["$329.17", "12"], 300, 40), 40);
  assert.equal(KC.fit(["$329.17"], 100, 40), 28);
  assert.equal(KC.fit(["123456"], 140, 60), 37);
  assert.ok(KC.textWidth("123456", 37) <= 140);
});

test("a value label struck by the reference line moves to sit on it", () => {
  assert.equal(KC.clear(100, 50, 120), 70);
  assert.equal(KC.clear(100, 50, 150), 100, "a line at the label's foot doesn't touch it");
  assert.equal(KC.clear(100, 50, 90), 100);
});

test("a value rolls a frame at a time and lands exactly on its target", () => {
  const steps = KC.steps(0, 12480, 1.5, (/** @type {number} */ t) => t);
  assert.equal(steps.length, 46);
  assert.deepEqual(plain(steps[0]), { t: 0, value: 0 });
  assert.deepEqual(plain(steps.at(-1)), { t: 1.5, value: 12480 });
  /** @type {[any, any, number][]} */
  const sets = [];
  const tl = { set: (/** @type {any} */ el, /** @type {any} */ p, /** @type {number} */ t) => sets.push([el, p.textContent, t]) };
  assert.equal(KC.roll(tl, "num", 0, 100, 2, 0.05, String), 2.05);
  assert.deepEqual(sets.map((s) => s[1]), ["0", "50", "100"]);
});

const FRAMES = { "16x9": [1920, 1080, 2], "1x1": [1080, 1080, 2], "4x5": [1080, 1350, 2], "9x16": [1080, 1920, 3] };

test("the chart box and its source line stop above the caption block in every frame (two lines, three in 9:16)", () => {
  for (const [name, [w, h, lines]] of Object.entries(FRAMES)) {
    const { AL, sets } = layout(w, h);
    const el = {};
    const room = AL.source(el, "A source");
    const src = sets.get(el);
    // A burned caption's plate: its lines, and 10 px of padding over and under them.
    const captionTop = h - AL.captions.bottom - lines * AL.captions.fontSize * 1.3 - 20;
    assert.ok(src.top + src.fontSize * 1.3 <= captionTop, `${name}: the source line clears the captions`);
    assert.ok(AL.chart.top + AL.chart.height <= captionTop, `${name}: the chart box clears the captions`);
    assert.ok(AL.chart.top >= AL.safe.top && AL.chart.left >= AL.safe.left, `${name}: inside the safe box`);
    assert.ok(src.fontSize >= 28 && room > src.fontSize, name);
  }
});

test("no source line takes no room", () => {
  const { AL } = layout(1080, 1920);
  assert.equal(AL.source({}, ""), 0);
});
