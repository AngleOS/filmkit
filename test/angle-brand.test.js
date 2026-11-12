import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

// brand.js runs in the browser; a stub document is enough to see what it draws.
function loadBrand() {
  /** @param {string} tag */
  const element = (tag) => {
    /** @type {any} */
    const e = { tag, attrs: {}, children: [] };
    e.setAttribute = (/** @type {string} */ k, /** @type {string} */ v) => (e.attrs[k] = v);
    e.appendChild = (/** @type {any} */ c) => e.children.push(c);
    return e;
  };
  const document = { createElementNS: (/** @type {string} */ _ns, /** @type {string} */ tag) => element(tag) };
  const window = /** @type {any} */ ({ AL: { W: 1920, H: 1080, mode: "L" } });
  vm.runInNewContext(readFileSync(new URL("../themes/angle/brand.js", import.meta.url), "utf8"), { window, document });
  return { KB: window.KB, element };
}

/** @param {any} e @returns {any[]} */
const all = (e) => [e, ...e.children.flatMap(all)];

test("the angle brand gives the kit KB.motif, KB.lockup and KB.lockupBox", () => {
  const { KB } = loadBrand();
  for (const name of ["motif", "lockup", "lockupBox"]) assert.equal(typeof KB[name], "function", name);
  assert.deepEqual({ ...KB.lockupBox(936.484, 540) }, { w: 936.484, h: 114, left: 492, top: 483, markCx: 157, shift: 312 });
});

test("the lockup and the lines take their colours from the ground's brand variables, never literals", () => {
  const { KB, element } = loadBrand();
  const lockup = element("svg"), motif = element("svg");
  KB.lockup(lockup);
  KB.motif(motif);
  const drawn = [...all(lockup), ...all(motif)];
  for (const e of drawn) {
    assert.equal(e.attrs.fill, undefined, `${e.tag} fill`);
    assert.equal(e.attrs["stop-color"], undefined, `${e.tag} stop-color`);
  }
  const styles = drawn.map((e) => e.attrs.style).filter(Boolean).join(" ");
  for (const v of ["--brand-mark", "--brand-word", "--brand-line"]) assert.match(styles, new RegExp(`var\\(${v}\\)`));
});

test("the angle theme's paper ground switches the brand colours", () => {
  const css = readFileSync(new URL("../themes/angle/theme.css", import.meta.url), "utf8");
  const onPaper = css.slice(css.indexOf(".on-paper"));
  for (const v of ["--brand-mark", "--brand-word", "--brand-line"]) {
    assert.match(css.slice(0, css.indexOf(".on-paper")), new RegExp(`${v}:`));
    assert.match(onPaper, new RegExp(`${v}:`));
  }
});
