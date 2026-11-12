// Kit scenes are documented from their own declarations, and the kit carries no brand: the theme draws the motif and
// the logo through window.KB (D-007).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { startTags } from "../src/build/html.js";

const kit = new URL("../kit/", import.meta.url);
const scenes = readdirSync(new URL("scenes/", kit)).filter((f) => f.endsWith(".html"));

test("every kit scene declares its variables, each with a label and a default", () => {
  for (const file of scenes) {
    const html = readFileSync(new URL(`scenes/${file}`, kit), "utf8");
    const root = startTags(html).find((t) => t.attrs.id === "root");
    assert.equal(root?.attrs["data-composition-id"], file.replace(/\.html$/, ""), file);
    for (const v of JSON.parse(root.attrs["data-composition-variables"])) {
      assert.ok(v.id && v.label && "default" in v, `${file}: ${JSON.stringify(v)}`);
    }
  }
});

test("the motif, mark and endcard scenes draw the brand through the theme's KB", () => {
  for (const file of ["motif.html", "mark.html", "endcard.html"]) {
    const html = readFileSync(new URL(`scenes/${file}`, kit), "utf8");
    assert.match(html, /KB\.(motif|lockup)\(/, file);
  }
});

test("kit code names no colour: every colour comes from the theme", () => {
  for (const file of ["layout.js", "motion.js", "film.css", ...scenes.map((f) => `scenes/${f}`)]) {
    assert.doesNotMatch(readFileSync(new URL(file, kit), "utf8"), /#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})\b|rgba?\(/i, file);
  }
});

/** The default theme's brand.js run against just enough DOM to build its SVG. */
function defaultKB() {
  /** @returns {any} */
  const element = () => ({
    /** @type {Record<string, string>} */ attrs: {},
    /** @type {any[]} */ children: [],
    /** @param {string} k @param {unknown} v */ setAttribute(k, v) { this.attrs[k] = String(v); },
    /** @param {any} c */ appendChild(c) { this.children.push(c); return c; },
  });
  const window = /** @type {any} */ ({ AL: { W: 1920, H: 1080, mode: "L" } });
  window.document = { createElementNS: element };
  runInNewContext(readFileSync(new URL("../themes/default/brand.js", import.meta.url), "utf8"), { window, ...window });
  return { KB: window.KB, element };
}

test("the default theme's KB draws a motif and a lockup whose mark meets in two pieces", () => {
  const { KB, element } = defaultKB();
  const motif = KB.motif(element());
  assert.ok(Object.values(motif).every((group) => group.length && group.every((/** @type {any} */ l) => l.attrs.pathLength === "1")));
  const parts = KB.lockup(element());
  for (const part of ["mark", "para", "tri", "word", "wipe"]) assert.ok(parts[part], part);
});

test("the default lockup box is centred on the frame at the asked width", () => {
  const { KB } = defaultKB();
  const box = KB.lockupBox(720, 540);
  assert.equal(box.left, (1920 - 720) / 2);
  assert.equal(box.top, Math.round(540 - box.h / 2));
  assert.ok(box.markCx > 0 && box.shift > 0 && box.markCx + box.shift <= 360);
});
