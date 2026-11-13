// filmkit brand: the palette worked out from an accent and a ground, and what it writes into a studio. Whether the
// smoke film reads in the new theme needs Chrome; the contrast maths here is what makes it pass `check`.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { hex, hsl, palette, proposeGround } from "../src/brand/palette.js";
import { writeBrand } from "../src/brand/write.js";
import { contrast, themeContrast } from "../src/contrast.js";
import { initStudio } from "../src/create.js";
import { openStudio } from "../src/studio.js";
import { loadTheme } from "../src/theme.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const ACCENTS = ["#ff5a1f", "#e3ef26", "#1a3cff", "#145237", "#7c3aed", "#22c55e", "#ff0000", "#888888", "#000000", "#ffffff"];

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
  assert.throws(() => writeBrand(dir, { ground: "grey" }), { code: "brand_option", message: /--ground "grey" should be dark or light/ });
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
