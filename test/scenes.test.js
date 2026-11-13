// Kit scenes are documented from their own declarations, and the kit carries no brand: the theme draws the motif and
// the logo through window.KB (D-007).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { startTags } from "../src/build/html.js";
import { sceneCatalogue } from "../src/scenes.js";
import { FilmkitError } from "../src/studio.js";
import { brandJs, loadTheme } from "../src/theme.js";

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

// GSAP takes a number's unit from the property's computed value; where that is a keyword (max-width's none, gap's
// normal, padding's empty shorthand) a bare number is dropped without an error. The chat scene's bubble lost its
// max-width in 9:16 this way. Films and templates are checked too, inline scripts included.
test("scenes give GSAP sizes whose default is a keyword as px strings, never bare numbers", () => {
  const films = new URL("../examples/studio/films/", import.meta.url);
  const templates = new URL("../templates/", import.meta.url);
  const own = [films, templates].flatMap((root) =>
    readdirSync(root, { recursive: true }).filter((f) => String(f).endsWith(".html")).map((f) => new URL(String(f), root)),
  );
  const bare = /\b(?:max|min)(?:Width|Height)\s*:\s*(?![\s"'`])|\b(?:padding|margin|gap|inset)\s*:\s*[\d(]/;
  for (const file of [...scenes.map((f) => new URL(`scenes/${f}`, kit)), ...own]) {
    const scripts = readFileSync(file, "utf8").split("<script>").slice(1).join("");
    assert.doesNotMatch(scripts, bare, file.pathname);
  }
});

/**
 * The default theme's compiled brand.js (angle's lines, then its own lockup) for a studio named `name`, run against
 * just enough DOM to build its SVG. The display face sets each letter 6 units wide at 10.
 * @param {string} name
 */
function defaultKB(name) {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-scenes-"));
  mkdirSync(join(dir, "brand"));
  writeFileSync(join(dir, "brand", "logo.svg"), '<svg viewBox="0 0 24 24"><linearGradient id="g"/><path fill="url(#g)"/></svg>');
  /** @returns {any} */
  const element = (/** @type {string} */ _ns, /** @type {string} */ tag) => ({
    tag,
    /** @type {Record<string, string>} */ attrs: {},
    /** @type {any[]} */ children: [],
    /** @param {string} k @param {unknown} v */ setAttribute(k, v) { this.attrs[k] = String(v); },
    /** @param {any} c */ appendChild(c) { this.children.push(c); return c; },
  });
  const window = /** @type {any} */ ({ AL: { W: 1920, H: 1080, mode: "L" } });
  const context = { measureText: (/** @type {string} */ text) => ({ width: text.length * 6 }) };
  window.document = { createElementNS: element, createElement: () => ({ getContext: () => context }), documentElement: {} };
  window.getComputedStyle = () => ({ getPropertyValue: () => "" });
  window.DOMParser = class {
    /** @param {string} svg */
    parseFromString(svg) {
      const [, box, inner] = /viewBox="([^"]*)">(.*)<\/svg>/.exec(svg) ?? [];
      return { documentElement: { nodeName: "svg", getAttribute: () => box, innerHTML: inner } };
    }
  };
  runInNewContext(brandJs(loadTheme(dir, "default"), name), { window, ...window });
  return { KB: window.KB, element };
}

/** @param {any} e @returns {any[]} */
const all = (e) => [e, ...e.children.flatMap(all)];

test("the default theme keeps angle's lines, and its lockup is the studio's logo, cut in two, beside its name", () => {
  const { KB, element } = defaultKB("Acme");
  const motif = KB.motif(element("", "svg"));
  assert.deepEqual(Object.keys(motif), ["diag", "horiz"]);
  const parts = KB.lockup(element("", "svg"));
  for (const part of ["mark", "para", "tri", "word", "wipe"]) assert.ok(parts[part], part);
  const [para, tri] = [parts.para, parts.tri].map((half) => half.children[0]);
  assert.deepEqual([para.attrs.viewBox, para.attrs.width], ["0 0 24 24", "12"]);
  // Each copy of the logo gets its own ids, so neither paints the other's gradient.
  assert.equal(para.innerHTML, '<linearGradient id="kb-logo-1-p-g"/><path fill="url(#kb-logo-1-p-g)"/>');
  assert.match(tri.innerHTML, /id="kb-logo-1-t-g"/);
  assert.equal(all(parts.word).find((e) => e.tag === "text").textContent, "Acme");
});

test("the default lockup box is centred on the frame, as wide as its name, and never wider than asked", () => {
  const { KB } = defaultKB("Acme");
  const box = KB.lockupBox(670, 540);
  assert.deepEqual({ ...box }, { w: 410, h: 120, left: 755, top: 480, markCx: 60, shift: 145 });
  const long = defaultKB("Acme Corporation International").KB.lockupBox(670, 540);
  assert.equal(long.w, 670);
  assert.equal(long.left, (1920 - 670) / 2);
});

test("the scene catalogue: every kit scene with its comment as the description and its declared variables", () => {
  const catalogue = sceneCatalogue();
  assert.deepEqual(catalogue.map((s) => `${s.name}.html`), [...scenes].sort());
  for (const s of catalogue) assert.ok(s.description.length > 40 && !/\s{2}|-->/.test(s.description), s.name);
  const [title] = sceneCatalogue("title");
  assert.match(title.description, /^A title card, or a title over another scene/);
  const entrance = title.variables.find((v) => v.id === "entrance");
  assert.deepEqual(entrance?.options?.map((o) => o.value), ["blur", "rise", "ink", "none"]);
  assert.throws(() => sceneCatalogue("nope"), (e) => e instanceof FilmkitError && e.code === "no_scene" && /Scenes: bars, /.test(e.message));
});

test("filmkit scenes prints the catalogue, --json gives the scenes shape, and an unknown scene exits 2", () => {
  /** @param {string[]} args */
  const filmkit = (args) => spawnSync(process.execPath, [fileURLToPath(new URL("../src/cli/index.js", import.meta.url)), ...args], { encoding: "utf8" });
  const list = filmkit(["scenes"]);
  assert.equal(list.status, 0);
  assert.match(list.stdout, /^bars {9}A bar chart drawn to scale: vertical bars over their labels, or horizontal bars under theirs\.\n/);
  const one = filmkit(["scenes", "bars", "--json"]);
  assert.deepEqual(JSON.parse(one.stdout), { ok: true, scenes: sceneCatalogue("bars") });
  assert.match(filmkit(["scenes", "bars"]).stdout, /\n {2}direction {2}enum, default "vertical": Direction\n {13}one of vertical, horizontal\n/);
  assert.equal(filmkit(["scenes", "nope"]).status, 2);
});
