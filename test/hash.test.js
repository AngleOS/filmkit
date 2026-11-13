import assert from "node:assert/strict";
import { cpSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { formatHash } from "../src/build/hash.js";
import { openFilm, openStudio } from "../src/studio.js";

function hook() {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-hash-"));
  cpSync(new URL("fixtures/studio", import.meta.url), dir, { recursive: true });
  const studio = openStudio(dir);
  return { studio, film: openFilm(studio, "hook") };
}

test("an unchanged film hashes the same, wherever the studio is", () => {
  const a = hook();
  const b = hook();
  assert.equal(formatHash(a.studio, a.film, "16x9"), formatHash(b.studio, b.film, "16x9"));
  assert.match(formatHash(a.studio, a.film, "16x9"), /^[0-9a-f]{64}$/);
});

test("each format has its own hash", () => {
  const { studio, film } = hook();
  assert.notEqual(formatHash(studio, film, "16x9"), formatHash(studio, film, "9x16"));
});

test("a changed theme invalidates: a file in one of its folders, one of its values, the logo or the studio's name", () => {
  const { studio, film } = hook();
  const dir = mkdtempSync(join(tmpdir(), "filmkit-theme-"));
  cpSync(studio.theme.dirs[1], dir, { recursive: true });
  const theme = { ...studio.theme, dirs: [studio.theme.dirs[0], dir] };
  const before = formatHash({ ...studio, theme }, film, "16x9");
  writeFileSync(join(dir, "brand.js"), "// the studio's own\n", { flag: "a" });
  const edited = formatHash({ ...studio, theme }, film, "16x9");
  const recoloured = formatHash({ ...studio, theme: { ...theme, values: { ...theme.values, accent: "#ff0000" } } }, film, "16x9");
  writeFileSync(join(studio.dir, "logo.svg"), "<svg/>");
  const relogoed = formatHash({ ...studio, theme: { ...theme, mark: join(studio.dir, "logo.svg") } }, film, "16x9");
  const renamed = formatHash({ ...studio, theme, name: "Other" }, film, "16x9");
  assert.equal(new Set([before, edited, recoloured, relogoed, renamed]).size, 5);
});

test("a changed, added or renamed film file invalidates, sound.json included", () => {
  const { studio, film } = hook();
  const hashes = new Set([formatHash(studio, film, "16x9")]);
  for (const change of [
    () => writeFileSync(join(film.dir, "sound.json"), '{ "cues": [1] }'),
    () => writeFileSync(join(film.dir, "compositions", "extra.html"), "<div></div>"),
    () => renameSync(join(film.dir, "compositions", "extra.html"), join(film.dir, "compositions", "other.html")),
  ]) {
    change();
    hashes.add(formatHash(studio, film, "16x9"));
  }
  assert.equal(hashes.size, 4);
});

test("a symlink to a folder or to nothing counts by where it points: one to a parent doesn't recurse", () => {
  const { studio, film } = hook();
  symlinkSync("..", join(film.dir, "up"));
  symlinkSync("missing.mp4", join(film.dir, "broll.mp4"));
  symlinkSync("loop.mp4", join(film.dir, "loop.mp4"));
  const before = formatHash(studio, film, "16x9");
  assert.equal(formatHash(studio, film, "16x9"), before);
  renameSync(join(film.dir, "broll.mp4"), join(film.dir, "old.mp4"));
  symlinkSync("other.mp4", join(film.dir, "broll.mp4"));
  assert.notEqual(formatHash(studio, film, "16x9"), before);
});

test("a symlink to a file counts by its contents, so an edited shared asset invalidates", () => {
  const { studio, film } = hook();
  const shared = join(mkdtempSync(join(tmpdir(), "filmkit-shared-")), "broll.mp4");
  writeFileSync(shared, "take 1");
  symlinkSync(shared, join(film.dir, "broll.mp4"));
  const before = formatHash(studio, film, "16x9");
  writeFileSync(shared, "take 2");
  assert.notEqual(formatHash(studio, film, "16x9"), before);
});

test("a film folder that is itself a link hashes its contents", () => {
  const { studio, film } = hook();
  const elsewhere = mkdtempSync(join(tmpdir(), "filmkit-film-"));
  cpSync(film.dir, elsewhere, { recursive: true });
  rmSync(film.dir, { recursive: true });
  symlinkSync(elsewhere, film.dir);
  const before = formatHash(studio, film, "16x9");
  writeFileSync(join(elsewhere, "sound.json"), "{}");
  assert.notEqual(formatHash(studio, film, "16x9"), before);
});
