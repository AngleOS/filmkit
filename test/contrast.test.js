import assert from "node:assert/strict";
import { test } from "node:test";
import { contrast, themeContrast } from "../src/contrast.js";
import { loadTheme } from "../src/theme.js";

const angle = loadTheme(process.cwd(), "angle").values;

test("contrast is WCAG's ratio, with a colour's alpha blended into its ground", () => {
  assert.equal(contrast("#000", "#ffffff"), 21);
  assert.equal(contrast("#777777", "#777777"), 1);
  assert.equal(Math.round(contrast("#56665e", "#ffffff") * 100) / 100, 6.07);
  assert.equal(contrast("#ffffff00", "#07120f"), 1);
});

test("the built-in themes pass on every one of their grounds", () => {
  for (const name of ["default", "angle", "paper"]) assert.deepEqual(themeContrast(loadTheme(process.cwd(), name).values), [], name);
});

test("reading text needs 4.5:1 on each ground, and the accent word 3:1, each with a colour that would pass", () => {
  const dim = { ...angle, text: { ...angle.text, muted: "#4a5a52" }, accent: "#2f6b2f" };
  const short = themeContrast(dim);
  assert.deepEqual(short.map((s) => [s.ground, s.role, s.key, s.required]), [
    ["ink", "muted", "text.muted", 4.5],
    ["ink", "accent", "accent", 3],
    ["accent-dark", "muted", "text.muted", 4.5],
    ["accent-dark", "accent", "accent", 3],
    ["jet", "muted", "text.muted", 4.5],
    ["jet", "accent", "accent", 3],
  ]);
  for (const s of short) {
    assert.ok(s.ratio < s.required, `${s.ground} ${s.role}`);
    assert.ok(contrast(s.suggested, s.on) >= s.required, `${s.ground} ${s.role}: ${s.suggested}`);
  }
});

test("paper is checked with the theme's colours for paper: a Pear word reads on Night and not on white", () => {
  const pear = { ...angle, accentOn: undefined };
  assert.deepEqual(themeContrast(pear).map((s) => [s.ground, s.key, s.colour, s.on, s.ratio, s.suggested]), [["paper", "accent", "#e3ef26", "#ffffff", 1.26, "#949b19"]]);
  const greyOnPaper = { ...angle, text: { ...angle.text, mutedOnPaper: "#a9bdb2" } };
  assert.deepEqual(themeContrast(greyOnPaper).map((s) => [s.ground, s.key]), [["paper", "text.mutedOnPaper"]]);
});
