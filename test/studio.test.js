import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { FORMATS, openFilm, openStudio, resolveFormats } from "../src/studio.js";

const FIXTURE = new URL("fixtures/studio", import.meta.url);

/** A copy of the fixture studio with its filmkit.json replaced. @param {object} config */
function studioWith(config) {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-studio-"));
  cpSync(FIXTURE, dir, { recursive: true });
  writeFileSync(join(dir, "filmkit.json"), JSON.stringify(config));
  return dir;
}

test("a studio needs filmkit.json", () => {
  assert.throws(() => openStudio(tmpdir()), /no filmkit\.json/);
});

test("the studio's formats, theme and renders default to all four, the default theme and renders/", () => {
  const dir = studioWith({});
  const studio = openStudio(dir);
  assert.deepEqual(studio.formats, FORMATS);
  assert.equal(studio.theme.name, "default");
  assert.equal(studio.renders, join(dir, "renders"));
  assert.equal(openStudio(studioWith({ renders: "out/films" })).renders.split("/").slice(-2).join("/"), "out/films");
});

test("filmkit.json breaking the schema, or naming an unknown theme, is an error", () => {
  assert.throws(() => openStudio(studioWith({ theme: "nope" })), /no theme "nope" \(angle, default, paper, or a folder/);
  assert.throws(() => openStudio(studioWith({ formats: ["16x9", "21x9"] })), /filmkit\.json: formats\[1\]: "21x9" should be one of/);
  assert.throws(() => openStudio(studioWith({ formats: [] })), /filmkit\.json: formats: list at least 1/);
  assert.throws(() => openStudio(studioWith({ theme: { accent: "red" } })), /filmkit\.json: theme\.accent: "red" should be a hex colour/);
});

test("a film is named, and must have an index.html", () => {
  const studio = openStudio(studioWith({}));
  assert.throws(() => openFilm(studio, undefined), /name a film \(hook, plain\)/);
  assert.throws(() => openFilm(studio, "missing"), /no films\/missing\/index\.html/);
  assert.equal(openFilm(studio, "hook").root["data-duration"], "6");
});

test("formats: the named ones, else the film's data-formats, else the studio's", () => {
  const studio = openStudio(studioWith({ formats: ["16x9", "1x1"] }));
  const hook = openFilm(studio, "hook"), plain = openFilm(studio, "plain");
  assert.deepEqual(resolveFormats(studio, hook, ["4x5", "1x1"]), ["4x5", "1x1"]);
  assert.deepEqual(resolveFormats(studio, hook), ["9x16"]);
  assert.deepEqual(resolveFormats(studio, plain), ["16x9", "1x1"]);
  assert.throws(() => resolveFormats(studio, plain, ["16:9"]), /unknown format 16:9/);
});

test("the angle theme is a theme the studio can name", () => {
  assert.equal(openStudio(studioWith({ theme: "angle" })).theme.name, "angle");
});
