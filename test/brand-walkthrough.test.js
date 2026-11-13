// filmkit brand in a terminal: the questions no flag answers, and the still to say yes to or change the brand from.
// The prompts are swapped for answers given in turn; the still, which needs HyperFrames' Chrome, for its build.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildStill } from "../src/brand/still.js";
import { brandStudio } from "../src/cli/commands/brand.js";
import { initStudio } from "../src/create.js";

function studio() {
  const dir = join(realpathSync(mkdtempSync(join(tmpdir(), "filmkit-brand-ask-"))), "acme-films");
  initStudio(dir, "Acme");
  return dir;
}

/**
 * Answers to each question in turn, and the questions asked, with what each started from.
 * @param {Record<string, unknown[]>} answers
 */
function asker(answers) {
  /** @type {[string, unknown][]} */
  const asked = [];
  /** @param {string} question */
  const next = (question) => async (/** @type {unknown} */ from) => {
    asked.push([question, from]);
    return /** @type {any} */ (answers[question]?.shift());
  };
  const ask = { site: next("site"), logo: next("logo"), accent: next("accent"), ground: next("ground"), font: next("font"), looksRight: next("looksRight") };
  return { ask: /** @type {import("../src/cli/commands/brand.js").Ask} */ (ask), asked };
}

/** @param {string} dir @param {Record<string, unknown>} options */
const ctx = (dir, options = {}, lines = /** @type {string[]} */ ([])) => ({ args: [], options: { studio: dir, ...options }, json: false, log: (/** @type {string} */ l) => lines.push(l) });

test("with nothing to go on, brand asks for each part, and on a no to the still asks again from the brand written", async () => {
  const dir = studio();
  const logo = join(dir, "..", "acme.svg");
  writeFileSync(logo, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>');
  const { ask, asked } = asker({
    site: [undefined], logo: [logo, undefined], accent: ["#1a3cff", "#ff5a1f"], ground: ["light", "dark"], font: [undefined, undefined],
    looksRight: [false, true],
  });
  const result = await brandStudio(ctx(dir), ask);
  assert.deepEqual(asked.map(([q]) => q), ["site", "logo", "accent", "ground", "font", "looksRight", "logo", "accent", "ground", "font", "looksRight"]);
  // The deep blue proposes a light ground; the second time round each question starts from the brand the still showed.
  assert.deepEqual([asked[3][1], asked[7][1], asked[8][1]], ["light", "#1a3cff", "light"]);
  assert.deepEqual(result.palette && [result.palette.accent, result.palette.ground], ["#ff5a1f", "dark"]);
  assert.equal(readFileSync(join(dir, "brand", "logo.svg"), "utf8"), readFileSync(logo, "utf8"));
});

test("given a part by a flag, brand asks nothing but whether the still looks right", async () => {
  const dir = studio();
  const { ask, asked } = asker({ looksRight: [true] });
  const result = await brandStudio(ctx(dir, { accent: "#ff5a1f" }), ask);
  assert.deepEqual(asked, [["looksRight", dir]]);
  assert.equal(result.palette?.accent, "#ff5a1f");
});

test("a website answered asks only for what it didn't give, naming an open font like the site's, until Google has the one typed", async (t) => {
  const dir = studio();
  const page = '<meta name="theme-color" content="#ff5a1f"><style>body { font-family: Graphik, sans-serif }</style>';
  t.mock.method(globalThis, "fetch", async (/** @type {string} */ url) =>
    url === "https://acme.test/" ? new Response(page) : new Response("", { status: url.startsWith("https://fonts.googleapis.com/") ? 400 : 404 }));
  const { ask, asked } = asker({ site: ["acme.test"], logo: [undefined], ground: ["dark"], font: ["Graphik Sans", ""], looksRight: [true] });
  const lines = /** @type {string[]} */ ([]);
  const result = await brandStudio(ctx(dir, {}, lines), ask);
  assert.deepEqual(asked, [["site", undefined], ["logo", undefined], ["ground", "dark"], ["font", "Inter"], ["font", "Inter"], ["looksRight", dir]]);
  assert.ok(lines.includes("· Google Fonts has no Graphik Sans: name a family as fonts.google.com spells it, or leave it empty"));
  assert.deepEqual([result.palette?.accent, result.font, result.site?.font], ["#ff5a1f", undefined, "Graphik"]);
});

test("the still is the poster template in the brand: its name in the line, its palette in the theme", () => {
  const dir = studio();
  writeFileSync(join(dir, "filmkit.json"), JSON.stringify({ name: "Acme's", formats: ["16x9"], theme: { accent: "#ff5a1f" } }));
  const build = buildStill(dir);
  assert.equal(build, join(dir, "build", "brand-still", "16x9"));
  assert.match(readFileSync(join(build, "index.html"), "utf8"), /"text":"Acme&#39;s, in one \*line\.\*"/);
  assert.match(readFileSync(join(build, "kit", "theme", "theme.css"), "utf8"), /--accent: #ff5a1f/);
});
