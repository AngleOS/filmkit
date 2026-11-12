// The product scenes and the UI kit: chat, code, terminal, composer and ui, the cursor, and film.css's components,
// all drawn from the theme so any brand can rebuild its own product on screen.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { startTags } from "../src/build/html.js";
import { loadTheme, themeCss } from "../src/theme.js";

const kit = new URL("../kit/", import.meta.url);
const read = (/** @type {string} */ file) => readFileSync(new URL(file, kit), "utf8");
const SIZES = { "16x9": [1920, 1080], "9x16": [1080, 1920], "1x1": [1080, 1080], "4x5": [1080, 1350] };

test("the kit has the product scenes", () => {
  for (const name of ["chat", "code", "terminal", "composer", "ui"]) assert.ok(existsSync(new URL(`scenes/${name}.html`, kit)), name);
});

test("an example film mounts every kit scene, so checking the examples checks them all", () => {
  const films = new URL("../examples/studio/films/", import.meta.url);
  const mounted = new Set(
    readdirSync(films).flatMap((film) => startTags(readFileSync(new URL(`${film}/index.html`, films), "utf8")).map((t) => t.attrs["data-composition-src"])),
  );
  for (const file of readdirSync(new URL("scenes/", kit)).filter((f) => f.endsWith(".html"))) {
    assert.ok(mounted.has(`kit/scenes/${file}`), file);
  }
});

test("film.css has the components a film rebuilds a product's UI from", () => {
  const css = read("film.css");
  for (const name of ["btn", "input", "badge", "card", "dialog", "tabs", "cursor", "caret"]) assert.match(css, new RegExp(`\\.fk-${name}\\b`), name);
});

test("the composer's cursor is a kit asset", () => {
  const src = startTags(read("scenes/composer.html")).find((t) => t.name === "img")?.attrs.src;
  assert.equal(src, "kit/assets/cursor.svg");
  assert.ok(existsSync(new URL("assets/cursor.svg", kit)));
});

test("both built-in themes colour code on dark and on paper", () => {
  for (const theme of ["default", "angle"]) {
    const css = themeCss(loadTheme(tmpdir(), theme).values);
    for (const block of [css.match(/:root\s*{[^}]*}/)?.[0], css.match(/\.on-paper\s*{[^}]*}/)?.[0]]) {
      for (const token of ["keyword", "string", "title", "number", "attr"]) assert.match(block ?? "", new RegExp(`--code-${token}:`), `${theme} ${token}`);
    }
  }
});

/** layout.js run for a format, against a root composition of that size. */
function layout(/** @type {[number, number]} */ [width, height]) {
  const root = { dataset: { width, height } };
  const window = /** @type {any} */ ({ document: { querySelector: () => root, documentElement: { dataset: {} } } });
  runInNewContext(read("layout.js"), { window, ...window });
  return window.AL;
}

test("the composer and the app window stay in the safe box in every format", () => {
  for (const [format, size] of Object.entries(SIZES)) {
    const AL = layout(/** @type {[number, number]} */ (size));
    const inSafe = (/** @type {{ left: number, top: number, width: number, height: number }} */ b, /** @type {string} */ what) => {
      assert.ok(b.left >= AL.safe.left && b.top >= AL.safe.top, `${format} ${what}`);
      assert.ok(b.left + b.width <= AL.W - AL.safe.right && b.top + b.height <= AL.H - AL.safe.bottom, `${format} ${what}`);
    };
    inSafe(AL.composer, "composer");
    for (const place of ["stage", "center"]) {
      const app = AL.app(place);
      inSafe(app, `app ${place}`);
      assert.ok(app.body.top > app.top && app.body.top + app.body.height === app.top + app.height, `${format} app ${place} body`);
    }
  }
});

test("every pick in the kit's scenes that sets 1:1 also sets 9:16, which falls back to 16:9", () => {
  for (const file of readdirSync(new URL("scenes/", kit)).filter((f) => f.endsWith(".html"))) {
    for (const [call] of read(`scenes/${file}`).matchAll(/pick\(\{[^}]*\}\)/g)) {
      if (/\bS:/.test(call)) assert.match(call, /\bV:/, `${file}: ${call}`);
    }
  }
});
