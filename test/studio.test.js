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

test("the studio's formats and theme default to all four and the default theme", () => {
  const studio = openStudio(studioWith({}));
  assert.deepEqual(studio.formats, FORMATS);
  assert.equal(studio.theme, "default");
});

test("an unknown theme or format in filmkit.json is an error", () => {
  assert.throws(() => openStudio(studioWith({ theme: "nope" })), /no theme "nope" \(default\)/);
  assert.throws(() => openStudio(studioWith({ formats: ["16x9", "21x9"] })), /unknown format 21x9/);
  assert.throws(() => openStudio(studioWith({ formats: [] })), /list one or more/);
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
