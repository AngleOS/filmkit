// filmkit brand: the palette worked out from an accent and a ground, and what it writes into a studio. Whether the
// smoke film reads in the new theme needs Chrome; the contrast maths here is what makes it pass `check`.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { googleFont } from "../src/brand/fonts.js";
import { hex, hsl, palette, proposeGround } from "../src/brand/palette.js";
import { writeBrand } from "../src/brand/write.js";
import { run as brand } from "../src/cli/commands/brand.js";
import { contrast, themeContrast } from "../src/contrast.js";
import { initStudio } from "../src/create.js";
import { openStudio } from "../src/studio.js";
import { loadTheme, themeCss } from "../src/theme.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const ACCENTS = ["#ff5a1f", "#e3ef26", "#1a3cff", "#145237", "#7c3aed", "#22c55e", "#ff0000", "#888888", "#000000", "#ffffff"];

/**
 * Google Fonts as filmkit sees it, offline: the css2 answer a plain client gets (one TrueType file per weight), those
 * files, and google/fonts' licences, by URL; anything else is a 404. The requests are kept, to look at.
 * @param {Record<string, string>} answers
 */
function googleFonts(answers) {
  /** @type {{ url: string, agent: string }[]} */
  const requests = [];
  /** @type {typeof fetch} */
  const get = async (url, init) => {
    requests.push({ url: String(url), agent: new Headers(init?.headers).get("user-agent") ?? "" });
    const body = answers[String(url)];
    return body === undefined ? new Response("Not Found", { status: 404 }) : new Response(body, { status: body === "400" ? 400 : 200 });
  };
  return { get, requests };
}

/** @param {string} family @param {number[]} weights the css2 answer for `family`, as fonts.googleapis.com gives it */
const css2 = (family, weights) =>
  weights.map((w) => `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: ${w};\n  src: url(https://fonts.gstatic.com/s/x/v1/${w}.ttf) format('truetype');\n}\n`).join("");
const INTER = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700";
const INTER_FILES = Object.fromEntries([400, 500, 600, 700].map((w) => [`https://fonts.gstatic.com/s/x/v1/${w}.ttf`, `ttf ${w}`]));

function studio() {
  const dir = join(realpathSync(mkdtempSync(join(tmpdir(), "filmkit-brand-"))), "acme-films");
  initStudio(dir, "Acme");
  return dir;
}

test("hsl and hex are each other's inverse", () => {
  for (const colour of ACCENTS) assert.equal(hex(...hsl(colour)), colour);
});

test("every accent, on either ground, makes a theme that passes WCAG AA on each of its grounds", () => {
  for (const accent of ACCENTS) {
    for (const ground of ["dark", "light"]) {
      const { extends: base, values } = palette(accent, ground);
      const theme = loadTheme(process.cwd(), { extends: base, ...values }).values;
      assert.deepEqual(themeContrast(theme), [], `${accent} on ${ground}`);
      // Text in the accent is held to 4.5:1, over the 3:1 check asks of display type.
      for (const [name, on] of Object.entries(values.grounds)) {
        const colour = name === "paper" ? values.accentOn?.paper ?? "" : values.accent;
        assert.ok(contrast(colour, on) >= 4.5, `${accent} on ${ground}: the accent on ${name}`);
      }
    }
  }
});

test("the brand's accent is kept where it reads, and a nearer one used for text where it doesn't, with its ratio", () => {
  const orange = palette("#ff5a1f", "dark");
  assert.equal(orange.extends, "default");
  assert.equal(orange.values.accent, "#ff5a1f");
  assert.deepEqual(orange.adjusted, [{ key: "accentOn.paper", brand: "#ff5a1f", used: "#cf4919", ratio: 3.11 }]);
  const blue = palette("#1a3cff", "light");
  assert.equal(blue.extends, "paper");
  assert.deepEqual([blue.values.accent, blue.values.accentOn?.paper, blue.adjusted], ["#1a3cff", "#1a3cff", []]);
});

test("the grounds take the accent's hue: a near-black and a deep shade on dark, white and a pale tint on light", () => {
  const dark = palette("#ff5a1f", "dark").values.grounds;
  assert.ok(Math.abs(hsl(dark.ink)[0] - hsl("#ff5a1f")[0]) < 2 && hsl(dark.ink)[2] < 0.08);
  assert.ok(hsl(dark["accent-dark"])[2] < 0.25);
  const light = palette("#ff5a1f", "light").values.grounds;
  assert.equal(light.ink, "#ffffff");
  assert.ok(hsl(light["accent-dark"])[2] > 0.85);
});

test("a bright accent proposes a dark ground, a dark one a light ground", () => {
  assert.deepEqual(["#e3ef26", "#ff5a1f", "#1a3cff", "#145237"].map(proposeGround), ["dark", "dark", "light", "light"]);
});

test("brand writes the logo, brand/theme and filmkit.json's name and theme, and the studio opens in it", () => {
  const dir = studio();
  const logo = join(dir, "..", "acme.svg");
  writeFileSync(logo, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>');
  const written = writeBrand(dir, { name: "Acme Co", logo, accent: "#FF5A1F" });
  assert.deepEqual(written.files.map((f) => f.slice(dir.length + 1)), ["brand/logo.svg", "brand/theme/theme.json", "filmkit.json"]);
  assert.deepEqual(written.palette && [written.palette.accent, written.palette.ground], ["#ff5a1f", "dark"]);
  assert.equal(readFileSync(join(dir, "brand", "logo.svg"), "utf8"), readFileSync(logo, "utf8"));
  // Edited in place: the formats stay on their one line.
  assert.equal(readFileSync(join(dir, "filmkit.json"), "utf8"), '{\n  "name": "Acme Co",\n  "formats": ["16x9", "9x16", "1x1", "4x5"],\n  "theme": "brand/theme"\n}\n');
  const opened = openStudio(dir);
  assert.equal(opened.name, "Acme Co");
  assert.deepEqual(opened.theme.dirs.map((d) => d.split("/").slice(-2).join("/")), ["themes/angle", "themes/default", "brand/theme"]);
  assert.equal(opened.theme.values.accent, "#ff5a1f");
  assert.equal(opened.theme.values.label, "Acme Co");
  assert.equal(opened.theme.mark, join(dir, "brand", "logo.svg"));
});

test("a later run changes only what it's given: the ground keeps the accent, the accent the ground, and the name the palette", () => {
  const dir = studio();
  writeBrand(dir, { accent: "#ff5a1f" });
  writeBrand(dir, { ground: "light" });
  const theme = JSON.parse(readFileSync(join(dir, "brand", "theme", "theme.json"), "utf8"));
  assert.equal(theme.extends, "paper");
  assert.match(theme.description, /the accent #ff5a1f on a light ground/);
  writeBrand(dir, { accent: "#1a3cff" });
  assert.equal(JSON.parse(readFileSync(join(dir, "brand", "theme", "theme.json"), "utf8")).extends, "paper", "the accent keeps the ground");
  const named = writeBrand(dir, { name: "Acme Co" });
  assert.deepEqual(named.files.map((f) => f.slice(dir.length + 1)), ["brand/theme/theme.json", "filmkit.json"]);
  const renamed = JSON.parse(readFileSync(join(dir, "brand", "theme", "theme.json"), "utf8"));
  assert.deepEqual([renamed.extends, renamed.label, renamed.description], ["paper", "Acme Co", "Acme Co's brand, from filmkit brand: the accent #1a3cff on a light ground."]);
});

test("switching the ground back and forth starts from the brand's own accent each time, not the one adjusted for text", () => {
  const dir = studio();
  const first = writeBrand(dir, { accent: "#ff5a1f", ground: "light" });
  assert.equal(first.palette?.adjusted[0].used, "#c14417");
  const back = writeBrand(dir, { ground: "dark" });
  assert.deepEqual([back.palette?.accent, JSON.parse(readFileSync(join(dir, "brand", "theme", "theme.json"), "utf8")).accent], ["#ff5a1f", "#ff5a1f"]);
});

test("a first run with only the ground takes the accent of the studio's theme, inline or a folder, else Pear", () => {
  const inline = studio();
  writeFileSync(join(inline, "filmkit.json"), JSON.stringify({ name: "Acme", theme: { extends: "default", accent: "#1a3cff" } }));
  assert.equal(writeBrand(inline, { ground: "light" }).palette?.accent, "#1a3cff");
  const folder = studio();
  mkdirSync(join(folder, "themes", "acme"), { recursive: true });
  writeFileSync(join(folder, "themes", "acme", "theme.json"), JSON.stringify({ extends: "default", accent: "#7c3aed" }));
  writeFileSync(join(folder, "filmkit.json"), JSON.stringify({ name: "Acme", theme: "themes/acme" }));
  assert.equal(writeBrand(folder, { ground: "light" }).palette?.accent, "#7c3aed");
  // A theme that doesn't load, such as an accent that isn't a hex, says nothing about the brand.
  const named = studio();
  writeFileSync(join(named, "filmkit.json"), JSON.stringify({ name: "Acme", theme: { extends: "default", accent: "orange" } }));
  assert.equal(writeBrand(named, { ground: "dark" }).palette?.accent, "#e3ef26");
  assert.equal(writeBrand(studio(), { ground: "dark" }).palette?.accent, "#e3ef26");
});

test("single values over the old theme stay, over the brand's, all but the colours the brand sets", () => {
  const dir = studio();
  writeFileSync(join(dir, "filmkit.json"), JSON.stringify({ name: "Acme", theme: { extends: "angle", accent: "#00ff00", credit: false } }, null, 2));
  writeBrand(dir, { accent: "#1a3cff" });
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "filmkit.json"), "utf8")).theme, { extends: "brand/theme", credit: false });
  assert.equal(openStudio(dir).theme.values.accent, "#1a3cff");
});

test("a PNG logo is embedded in an SVG at its own size", () => {
  const dir = studio();
  // A PNG's signature and IHDR: 64 × 32.
  const png = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
  png.write("IHDR", 12, "latin1");
  png.writeUInt32BE(64, 16);
  png.writeUInt32BE(32, 20);
  writeFileSync(join(dir, "logo.png"), png);
  writeBrand(dir, { logo: join(dir, "logo.png") });
  const svg = readFileSync(join(dir, "brand", "logo.svg"), "utf8");
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 32"><image href="data:image\/png;base64,iVBORw0KGgo/);
  assert.match(svg, /width="64" height="32"\/><\/svg>\n$/);
});

test("brand says what's wrong with what it's given, and writes nothing", () => {
  const dir = studio();
  const before = readFileSync(join(dir, "filmkit.json"), "utf8");
  assert.throws(() => writeBrand(dir, {}), { code: "brand_nothing" });
  assert.throws(() => writeBrand(dir, { accent: "orange" }), { code: "brand_option", message: /--accent "orange" should be a hex colour/ });
  assert.throws(() => writeBrand(dir, { ground: "grey" }), { code: "option_choice", message: /--ground is dark or light, not "grey"/ });
  assert.throws(() => writeBrand(dir, { logo: join(dir, "nope.svg") }), { code: "logo_missing" });
  assert.throws(() => writeBrand(dir, { logo: join(dir, "AGENTS.md") }), { code: "bad_logo" });
  assert.equal(readFileSync(join(dir, "filmkit.json"), "utf8"), before);
});

test("filmkit brand --json prints what it wrote and the palette", () => {
  const dir = studio();
  const { status, stdout } = spawnSync(process.execPath, [CLI, "brand", "--accent", "#e3ef26", "--json"], { cwd: dir, encoding: "utf8" });
  assert.equal(status, 0);
  const result = JSON.parse(stdout);
  assert.deepEqual([result.ok, result.name, result.palette.ground, result.palette.adjusted.map((/** @type {{ key: string }} */ a) => a.key)], [true, "Acme", "dark", ["accentOn.paper"]]);
  assert.deepEqual(result.files, [join(dir, "brand", "theme", "theme.json"), join(dir, "filmkit.json")]);
});

test("a site URL from setup is said to be unused, not dropped quietly", async () => {
  const dir = studio();
  /** @type {string[]} */
  const lines = [];
  const result = await brand({ args: [], options: { studio: dir, name: "Acme", "from-url": "https://acme.test" }, json: false, log: (line) => lines.push(String(line)) });
  assert.equal(result.ok, true);
  assert.equal(lines[0], "· https://acme.test isn't read yet: this version of filmkit brand takes the name, logo, accent, ground and font");
});

test("a Google Fonts family comes as one whole file per weight, asked for as filmkit, with its licence", async () => {
  const { get, requests } = googleFonts({ [INTER]: css2("Inter", [400, 500, 600, 700]), ...INTER_FILES, "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt": "SIL Open Font License" });
  const font = await googleFont("Inter", get);
  assert.equal(font.family, "Inter");
  assert.deepEqual(font.faces.map((f) => [f.weight, f.file, Buffer.from(f.bytes).toString()]), [400, 500, 600, 700].map((w) => [w, `Inter-${w}.ttf`, `ttf ${w}`]));
  assert.deepEqual(font.licence, { file: "Inter-OFL.txt", text: "SIL Open Font License" });
  assert.ok(requests.every((r) => r.agent === "filmkit (+https://github.com/AngleOS/filmkit)"));
});

test("a family with fewer weights comes in those it has, and its licence is looked for under each of Google's", async () => {
  const { get } = googleFonts({
    "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;500;600;700": css2("Roboto Slab", [400]),
    "https://fonts.gstatic.com/s/x/v1/400.ttf": "ttf",
    "https://raw.githubusercontent.com/google/fonts/main/apache/robotoslab/LICENSE.txt": "Apache License",
  });
  const font = await googleFont("Roboto Slab", get);
  assert.deepEqual([font.faces.map((f) => f.file), font.licence?.file], [["RobotoSlab-400.ttf"], "RobotoSlab-LICENSE.txt"]);
  const { get: unlicensed } = googleFonts({ [INTER]: css2("Inter", [400]), "https://fonts.gstatic.com/s/x/v1/400.ttf": "ttf" });
  assert.equal((await googleFont("Inter", unlicensed)).licence, undefined);
});

test("a family Google Fonts doesn't have, or a network that's down, says so", async () => {
  await assert.rejects(googleFont("Intre", googleFonts({ "https://fonts.googleapis.com/css2?family=Intre:wght@400;500;600;700": "400" }).get), { code: "font_unknown" });
  const down = () => Promise.reject(Object.assign(new TypeError("fetch failed"), { cause: new Error("getaddrinfo ENOTFOUND fonts.googleapis.com") }));
  await assert.rejects(googleFont("Inter", down), { code: "font_fetch", message: /couldn't fetch .*: Error: getaddrinfo ENOTFOUND/ });
});

test("the font goes into brand/theme/fonts and the theme's fonts for titles and text, and stays until another replaces it, leaving fonts added by hand", async () => {
  const dir = studio();
  const { get } = googleFonts({ [INTER]: css2("Inter", [400, 500, 600, 700]), ...INTER_FILES, "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt": "OFL" });
  const written = writeBrand(dir, { font: await googleFont("Inter", get) });
  const fonts = join(dir, "brand", "theme", "fonts");
  assert.deepEqual(written.files.map((f) => f.slice(dir.length + 1)), [
    ...[400, 500, 600, 700].map((w) => `brand/theme/fonts/Inter-${w}.ttf`), "brand/theme/fonts/Inter-OFL.txt", "brand/theme/theme.json", "filmkit.json",
  ]);
  const theme = openStudio(dir).theme;
  assert.deepEqual([theme.values.fonts.display.family, theme.values.fonts.display.weight, theme.values.fonts.ui.family, theme.values.fonts.mono.family], ["Inter", 600, "Inter", "Geist Mono"]);
  assert.match(themeCss(theme.values), /@font-face \{ font-family: "Inter"; src: url\("fonts\/Inter-600\.ttf"\); font-weight: 600; \}/);
  writeBrand(dir, { accent: "#1a3cff" });
  assert.equal(openStudio(dir).theme.values.fonts.ui.family, "Inter", "a later run without --font keeps it");
  const { get: lobster } = googleFonts({ "https://fonts.googleapis.com/css2?family=Lobster:wght@400;500;600;700": css2("Lobster", [400]), "https://fonts.gstatic.com/s/x/v1/400.ttf": "ttf" });
  writeFileSync(join(fonts, "Acme-Display.otf"), "the studio's own");
  writeBrand(dir, { font: await googleFont("Lobster", lobster) });
  assert.deepEqual(readdirSync(fonts).sort(), ["Acme-Display.otf", "Lobster-400.ttf"]);
  assert.deepEqual(openStudio(dir).theme.values.fonts.display, { family: "Lobster", weight: 400, tracking: "-0.035em", leading: 1.02 });
  assert.ok(!existsSync(join(fonts, "Inter-OFL.txt")));
});

test("a mistyped option fails before the font is downloaded", async (t) => {
  const dir = studio();
  const fetched = t.mock.method(globalThis, "fetch", async () => new Response("", { status: 500 }));
  const run = (/** @type {Record<string, string>} */ options) => brand({ args: [], options: { studio: dir, font: "Inter", ...options }, json: false, log: () => {} });
  await assert.rejects(run({ accent: "orange" }), { code: "brand_option" });
  await assert.rejects(run({ ground: "grey" }), { code: "option_choice" });
  await assert.rejects(run({ logo: join(dir, "nope.svg") }), { code: "logo_missing" });
  assert.equal(fetched.mock.callCount(), 0);
});
