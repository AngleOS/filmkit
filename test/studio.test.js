import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { FORMATS, openFilm, openStudio, resolveFormats } from "../src/studio.js";

const FIXTURE = new URL("fixtures/studio", import.meta.url);

/** A copy of the fixture studio with its filmkit.json replaced. @param {object | null} config */
function studioWith(config) {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-studio-"));
  cpSync(FIXTURE, dir, { recursive: true });
  writeFileSync(join(dir, "filmkit.json"), JSON.stringify(config));
  return dir;
}

test("a studio needs filmkit.json", () => {
  assert.throws(() => openStudio(tmpdir()), { code: "no_studio", message: /^No filmkit\.json in .*, so there's no studio here\. Make one with: filmkit init$/ });
});

test("the studio's formats, theme and renders default to all four, the default theme and renders/", () => {
  const dir = studioWith({});
  const studio = openStudio(dir);
  assert.deepEqual(studio.formats, FORMATS);
  assert.equal(studio.theme.name, "default");
  assert.equal(studio.renders, join(dir, "renders"));
  assert.equal(openStudio(studioWith({ renders: "out/films" })).renders.split("/").slice(-2).join("/"), "out/films");
});

test("filmkit.json breaking the schema names the key, and an unknown theme lists the themes", () => {
  assert.throws(() => openStudio(studioWith({ theme: "nope" })), { code: "unknown_theme", message: /no theme called "nope"\. Themes: angle, default, paper, or a folder/ });
  assert.throws(() => openStudio(studioWith({ formats: ["16x9", "21x9"] })), { code: "config_key", message: /^filmkit\.json: formats\[1\]: "21x9" should be one of/ });
  assert.throws(() => openStudio(studioWith({ formats: [] })), /filmkit\.json: formats: list at least 1/);
  assert.throws(() => openStudio(studioWith({ theme: { accent: "red" } })), /filmkit\.json: theme\.accent: "red" should be a hex colour/);
  assert.throws(() => openStudio(studioWith(null)), { code: "config_key", message: /null should be an object/, fix: /schema\/filmkit\.schema\.json$/ });
});

test("a filmkit.json that isn't JSON points at the line and column", () => {
  const dir = studioWith({});
  writeFileSync(join(dir, "filmkit.json"), '{\n  "theme": "angle"\n  "formats": []\n}\n');
  assert.throws(() => openStudio(dir), { code: "config_json", fix: `${join(dir, "filmkit.json")}:3:3` });
});

test("a film is named, and must have an index.html", () => {
  const studio = openStudio(studioWith({}));
  assert.throws(() => openFilm(studio, undefined), { code: "film_unnamed", message: /^Name a film\. Films: hook, plain\./ });
  assert.throws(() => openFilm(studio, "missing"), { code: "no_film", fix: "filmkit new missing" });
  assert.equal(openFilm(studio, "hook").root["data-duration"], "6");
  // a name is a folder in films/, never a path (it reaches here from MCP clients)
  for (const name of ["../films/hook", "hook/", ".", ".."]) assert.throws(() => openFilm(studio, name), { code: "no_film" });
});

test("formats: the named ones, else the film's data-formats, else the studio's", () => {
  const studio = openStudio(studioWith({ formats: ["16x9", "1x1"] }));
  const hook = openFilm(studio, "hook"), plain = openFilm(studio, "plain");
  assert.deepEqual(resolveFormats(studio, hook, ["4x5", "1x1"]), ["4x5", "1x1"]);
  assert.deepEqual(resolveFormats(studio, hook), ["9x16"]);
  assert.deepEqual(resolveFormats(studio, plain), ["16x9", "1x1"]);
  assert.throws(() => resolveFormats(studio, plain, ["16:9"]), { code: "unknown_format", message: /^There's no format called "16:9"\./ });
});

test("a film's master needs a root, and mounts only scenes the kit has", () => {
  const dir = studioWith({});
  const page = join(dir, "films/plain/index.html");
  const html = readFileSync(page, "utf8");
  writeFileSync(page, html.replace("'main'", "'other'"));
  assert.throws(() => openFilm(openStudio(dir), "plain"), { code: "no_root" });
  writeFileSync(page, html.replace("</div>\n", '<div data-composition-src="kit/scenes/titel.html"></div>\n$&'));
  assert.throws(() => openFilm(openStudio(dir), "plain"), { code: "unknown_scene", message: /kit has no scene "titel"\. Use one of: .*\btitle\b/ });
});

test("the angle theme is a theme the studio can name", () => {
  assert.equal(openStudio(studioWith({ theme: "angle" })).theme.name, "angle");
});
