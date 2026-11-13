import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { assemble } from "../src/build/assemble.js";
import { rootTag } from "../src/build/html.js";
import { sources, syncChange, watchSources } from "../src/build/watch.js";
import { PACKAGE, openFilm, openStudio } from "../src/studio.js";

function preview() {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-watch-"));
  cpSync(new URL("fixtures/studio", import.meta.url), dir, { recursive: true });
  const studio = openStudio(dir);
  const film = openFilm(studio, "hook");
  const out = assemble(studio, film, "9x16", join(dir, "build", "hook", "preview"));
  return { studio, film, out, source: { dir: film.dir, to: "" } };
}

/** @param {string} out */
const size = (out) => {
  const root = rootTag(readFileSync(join(out, "index.html"), "utf8")).attrs;
  return `${root["data-width"]}x${root["data-height"]}`;
};

test("the film, the kit and the theme are watched where assemble() puts them", () => {
  const { studio, film } = preview();
  assert.deepEqual(sources(studio, film), [
    { dir: film.dir, to: "" },
    { dir: join(PACKAGE, "kit"), to: "kit" },
    { dir: join(PACKAGE, "themes", "default"), to: join("kit", "theme") },
  ]);
});

test("a saved master is written sized for the format shown", () => {
  const { film, out, source } = preview();
  const page = join(film.dir, "index.html");
  writeFileSync(page, readFileSync(page, "utf8").replace("A &amp; B", "C &amp; D"));
  assert.equal(syncChange(out, "4x5", source, "index.html"), "index.html");
  assert.match(readFileSync(join(out, "index.html"), "utf8"), /C &amp; D/);
  assert.equal(size(out), "1080x1350");
});

test("a saved master keeps the film's built sound mounted", () => {
  const { studio, film, source } = preview();
  mkdirSync(join(studio.dir, "build", "hook"), { recursive: true });
  writeFileSync(join(studio.dir, "build", "hook", "sound.m4a"), "aac");
  const out = assemble(studio, film, "9x16", join(studio.dir, "build", "hook", "preview"));
  assert.equal(syncChange(out, "4x5", source, "index.html"), "index.html");
  assert.match(readFileSync(join(out, "index.html"), "utf8"), /<audio id="sound" class="clip" src="sound\.m4a"/);
});

test("a film's own file is copied in, and removed when it's gone", () => {
  const { film, out, source } = preview();
  mkdirSync(join(film.dir, "assets"));
  writeFileSync(join(film.dir, "assets", "logo.svg"), "<svg/>");
  assert.equal(syncChange(out, "9x16", source, join("assets", "logo.svg")), join("assets", "logo.svg"));
  assert.equal(readFileSync(join(out, "assets", "logo.svg"), "utf8"), "<svg/>");
  rmSync(join(film.dir, "compositions"), { recursive: true });
  assert.equal(syncChange(out, "9x16", source, "compositions"), "compositions");
  assert.ok(!existsSync(join(out, "compositions")));
});

test("a file that came and went before the copy, like an editor's temporary file, changes nothing", () => {
  const { out, source } = preview();
  assert.equal(syncChange(out, "9x16", source, ".!123!index.html"), null);
});

test("sound.json stays out of the build", () => {
  const { out, source } = preview();
  assert.equal(syncChange(out, "9x16", source, "sound.json"), null);
  assert.ok(!existsSync(join(out, "sound.json")));
});

test("a kit or theme file lands under kit/", () => {
  const { out } = preview();
  const kit = mkdtempSync(join(tmpdir(), "filmkit-kit-"));
  writeFileSync(join(kit, "motion.js"), "// changed");
  assert.equal(syncChange(out, "9x16", { dir: kit, to: "kit" }, "motion.js"), join("kit", "motion.js"));
  assert.equal(readFileSync(join(out, "kit", "motion.js"), "utf8"), "// changed");
  writeFileSync(join(kit, "theme.css"), ":root {}");
  syncChange(out, "9x16", { dir: kit, to: join("kit", "theme") }, "theme.css");
  assert.equal(readFileSync(join(out, "kit", "theme", "theme.css"), "utf8"), ":root {}");
});

test("a master without its root is an error, and the build keeps the last good one", () => {
  const { film, out, source } = preview();
  writeFileSync(join(film.dir, "index.html"), "<div>");
  assert.throws(() => syncChange(out, "9x16", source, "index.html"), /no data-composition-id="main" root/);
  assert.equal(size(out), "1080x1920");
});

test("watching copies each save into the build, and show() resizes the master", { timeout: 5000 }, async (t) => {
  const { studio, film, out } = preview();
  /** @type {(path: string) => void} */
  let changed = () => {};
  const live = watchSources(studio, film, out, "9x16", {
    onChange: (path) => changed(path),
    onError: (path, error) => assert.fail(`${path}: ${error.message}`),
  });
  t.after(() => live.close());
  const card = join("compositions", "card.html");
  const saved = new Promise((resolve) => (changed = (path) => path === card && resolve(path)));
  // macOS starts listening a moment after watch() returns, so the save is repeated until it's seen.
  const save = () => writeFileSync(join(film.dir, card), "<template>saved</template>");
  save();
  const resave = setInterval(save, 200);
  t.after(() => clearInterval(resave));
  assert.equal(await saved, card);
  assert.equal(readFileSync(join(out, card), "utf8"), "<template>saved</template>");
  live.show("1x1");
  assert.equal(size(out), "1080x1080");
});
