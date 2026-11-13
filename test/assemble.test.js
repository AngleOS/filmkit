import assert from "node:assert/strict";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { assemble } from "../src/build/assemble.js";
import { rootTag } from "../src/build/html.js";
import { openFilm, openStudio } from "../src/studio.js";

function hook() {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-assemble-"));
  cpSync(new URL("fixtures/studio", import.meta.url), dir, { recursive: true });
  const studio = openStudio(dir);
  return { studio, film: openFilm(studio, "hook") };
}

test("build/<film>/<format>/ holds the film sized for the format", () => {
  const { studio, film } = hook();
  const out = assemble(studio, film, "9x16");
  assert.equal(out, join(studio.dir, "build", "hook", "9x16"));
  const root = rootTag(readFileSync(join(out, "index.html"), "utf8")).attrs;
  assert.deepEqual([root["data-width"], root["data-height"]], ["1080", "1920"]);
  assert.ok(existsSync(join(out, "compositions", "card.html")));
  assert.ok(!existsSync(join(out, "sound.json")));
  assert.deepEqual(JSON.parse(readFileSync(join(out, "meta.json"), "utf8")), { id: "hook-9x16", name: "hook 9x16" });
  assert.ok(existsSync(join(out, "hyperframes.json")));
});

test("the kit, GSAP and the theme are copied in, never linked", () => {
  const { studio, film } = hook();
  const out = assemble(studio, film, "16x9");
  for (const file of ["kit/layout.js", "kit/motion.js", "kit/film.css", "kit/scenes/title.html", "kit/vendor/gsap.min.js", "kit/theme/theme.css", "kit/theme/brand.js", "kit/theme/fonts/OFL.txt"]) {
    assert.ok(lstatSync(join(out, file)).isFile(), file);
  }
});

test("the theme's folders are copied base first, with theme.css compiled from their theme.json", () => {
  const { studio, film } = hook();
  mkdirSync(join(studio.dir, "brand", "theme"), { recursive: true });
  writeFileSync(join(studio.dir, "brand", "theme", "theme.json"), JSON.stringify({ extends: "angle", accent: "#ff5a1f" }));
  writeFileSync(join(studio.dir, "brand", "theme", "brand.js"), "// the studio's own\n");
  writeFileSync(join(studio.dir, "filmkit.json"), JSON.stringify({ theme: "brand/theme" }));
  const out = assemble(openStudio(studio.dir), film, "16x9");
  assert.match(readFileSync(join(out, "kit/theme/theme.css"), "utf8"), /--accent: #ff5a1f;/);
  assert.equal(readFileSync(join(out, "kit/theme/brand.js"), "utf8"), "// the studio's own\n");
  assert.ok(existsSync(join(out, "kit/theme/fonts/Geist-Regular.woff2")));
});

test("assembling again starts clean", () => {
  const { studio, film } = hook();
  const out = assemble(studio, film, "1x1");
  writeFileSync(join(out, "stale.html"), "");
  assemble(studio, film, "1x1");
  assert.ok(!existsSync(join(out, "stale.html")));
});
