import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { validate } from "../src/schema.js";
import { loadTheme, themeCss } from "../src/theme.js";

/** A studio holding `files` (path → JSON value, or text). @param {Record<string, unknown>} files */
function studio(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-theme-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), typeof content === "string" ? content : JSON.stringify(content));
  }
  return dir;
}

/** @param {string} css @param {string} name */
const prop = (css, name) => css.slice(0, css.indexOf(".on-paper")).match(new RegExp(`--${name}: ([^;]+);`))?.[1];

for (const name of ["angle", "default"]) {
  test(`the ${name} theme compiles to its golden CSS`, () => {
    const golden = readFileSync(new URL(`fixtures/themes/${name}.css`, import.meta.url), "utf8");
    assert.equal(themeCss(loadTheme(studio(), name).values), golden);
  });
}

test("a theme folder in the studio extends a built-in: its values and font faces over the base's", () => {
  const dir = studio({
    "brand/theme/theme.json": { extends: "angle", label: "Acme", accent: "#ff5a1f", fonts: { dir: "type", display: { family: "Fraunces" }, faces: [{ family: "Fraunces", weight: 600, file: "Fraunces.woff2" }] } },
    "brand/theme/type/Fraunces.woff2": "",
  });
  const theme = loadTheme(dir, "brand/theme");
  assert.equal(theme.name, "brand/theme");
  assert.deepEqual(theme.dirs.map((d) => d.split("/").slice(-2).join("/")), ["themes/angle", "brand/theme"]);
  const css = themeCss(theme.values);
  assert.match(css, /^\/\* The Acme theme/);
  assert.equal(prop(css, "accent"), "#ff5a1f");
  assert.equal(prop(css, "brand-mark"), "#ff5a1f");
  assert.equal(prop(css, "ink"), "#07120f");
  assert.equal(prop(css, "font-display"), '"Fraunces", sans-serif');
  assert.equal(prop(css, "font-ui"), '"Geist", sans-serif');
  assert.equal(prop(css, "title-weight"), "600");
  assert.match(css, /src: url\("fonts\/Geist-Regular\.woff2"\)/);
  assert.match(css, /font-family: "Fraunces"; src: url\("type\/Fraunces\.woff2"\); font-weight: 600;/);
});

test("filmkit.json overrides single values of a theme, the default one when it names none", () => {
  const css = themeCss(loadTheme(studio(), { extends: "angle", accent: "#ff5a1f", text: { muted: "#999999" } }).values);
  assert.equal(prop(css, "accent"), "#ff5a1f");
  assert.equal(prop(css, "muted-foreground"), "#999999");
  assert.equal(prop(css, "foreground"), "#eef3ec");
  const plain = loadTheme(studio(), { accent: "#123456" });
  assert.equal(plain.name, "default");
  assert.equal(plain.values.accent, "#123456");
});

test("a theme that can't be found, or that breaks the schema, says what's wrong", () => {
  assert.throws(() => loadTheme(studio(), "nope"), /no theme "nope" \(angle, default, or a folder with a theme\.json\)/);
  assert.throws(() => loadTheme(studio(), "./brand/theme"), /no brand\/theme\/theme\.json/);
  const bad = (/** @type {object} */ json) => () => loadTheme(studio({ "t/theme.json": json }), "./t");
  assert.throws(bad({ extends: "angle", accent: "pear" }), /t\/theme\.json: accent: "pear" should be a hex colour such as "#e3ef26"/);
  assert.throws(bad({ extends: "angle", grounds: { foreground: "#000" } }), /grounds\.foreground: should be a ground name/);
  assert.throws(bad({ extends: "angle", colour: "#000" }), /colour: unknown key/);
  assert.throws(bad({ extends: "angle", motif: "waves" }), /motif: "waves" should be one of lines, grid, dots, none/);
  assert.throws(bad({ extends: "angle", fonts: { display: { family: 'Inter"; }' } } }), /fonts\.display\.family: .* should be a font family name/);
  assert.throws(bad({ extends: "angle", fonts: { faces: [{ family: "Inter", weight: 400, file: "Inter.woff2" }] } }), /no fonts\/Inter\.woff2 in the theme's folders/);
  assert.throws(bad({ accent: "#000000" }), /theme "\.\/t": grounds: missing; text: missing; fonts: missing/);
  assert.throws(bad({ extends: "." }), /t\/theme\.json extends itself/);
  assert.throws(() => loadTheme(studio({ "t/theme.json": "{" }), "./t"), /t\/theme\.json: .*JSON/);
});

test("filmkit.json is checked against the schema", () => {
  assert.deepEqual(validate({ name: "Acme", formats: ["16x9"], theme: "angle", renders: "out" }), []);
  assert.deepEqual(validate({ formats: ["16x9", "21x9"] }), ['formats[1]: "21x9" should be one of 16x9, 9x16, 1x1, 4x5']);
  assert.match(validate({ formats: [] })[0], /formats: list at least 1/);
  assert.deepEqual(validate({ theme: 7 }), ["theme: 7 should be a string or an object (a built-in theme (angle, default), a theme folder in the studio such as \"brand/theme\", or { \"extends\": one of those, …single values to override })"]);
  assert.deepEqual(validate({ theme: { accent: "#fff", fonts: { display: { weight: 650.5 } } } }), ["theme.fonts.display.weight: 650.5 should be a whole number"]);
  assert.deepEqual(validate({ render: "out" }), ["render: unknown key ($schema, name, formats, theme, renders)"]);
});
