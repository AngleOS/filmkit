import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { formatHash } from "../src/build/hash.js";
import { findings } from "../src/cli/commands/check.js";
import { openFilm, openStudio } from "../src/studio.js";

const report = {
  ok: false,
  lint: { findings: [{ code: "subcomposition_blanks_before_host", severity: "warning", message: "blank", selector: "#a", bbox: {} }] },
  layout: { findings: [{ code: "text_box_overflow", severity: "error", message: "overflows", selector: "#src" }] },
  craft: { findings: [{ code: "hint", severity: "info", message: "fyi" }] },
  snapshots: { enabled: false },
};

const where = { film: "bad", format: "16x9", dir: "/studio/build/bad/16x9", root: "#root", duration: 20 };

test("check reports HyperFrames' errors and warnings from every pass, without the info", () => {
  const { ok, errors, warnings } = findings({ ok: false, stdout: JSON.stringify(report) }, where);
  assert.equal(ok, false);
  assert.deepEqual(errors.map((e) => e.code), ["text_box_overflow"]);
  assert.deepEqual(warnings.map((w) => w.code), ["subcomposition_blanks_before_host"]);
});

test("a clean report passes", () => {
  assert.deepEqual(findings({ ok: true, stdout: JSON.stringify({ ok: true, lint: { findings: [] } }) }, where), { ok: true, errors: [], warnings: [] });
});

test("no report is a failure, with the last word from HyperFrames' stderr", () => {
  const [error] = findings({ ok: false, stdout: "", stderr: "[hyperframes] probe\nError: Chrome crashed\n" }, where).errors;
  assert.deepEqual(error, { code: "no_report", message: "HyperFrames gave no report (Error: Chrome crashed). See what's missing with: filmkit doctor" });
});

// A real report from HyperFrames 0.8.186, trimmed: a planted film with overlapping, overflowing and dim text, and craft
// warnings from another.
const real = readFileSync(new URL("fixtures/check-report.json", import.meta.url), "utf8");

test("a layout finding names the format, the time, the element by its text, what it collides with, and the snapshot that shows it", () => {
  const { errors } = findings({ ok: false, stdout: real }, where);
  const said = Object.fromEntries(errors.map((e) => [e.code, e]));
  assert.deepEqual(said.content_overlap, {
    code: "content_overlap",
    selector: "#a",
    time: 0.22,
    message: '16x9 at 0.22 s: "Films are code" (#a) overlaps #b. See it with: filmkit snapshot bad 16x9 --at 0.22',
    fix: "filmkit snapshot bad 16x9 --at 0.22",
  });
  assert.equal(said.text_box_overflow.message, '16x9 at 0.22 s: "Off the edge of it" (#d) runs out of the frame by 707 px. See it with: filmkit snapshot bad 16x9 --at 0.22');
  assert.equal(
    said.contrast_aa_failure.message,
    '16x9 at 0.22 s: "Dim words here" (#c) is 1.49:1 against its ground, under WCAG AA\'s 3:1; rgb(96,96,96) would pass. See it with: filmkit snapshot bad 16x9 --at 0.22',
  );
});

test("the craft warnings are in Filmkit's words, and every finding with a time gives its snapshot", () => {
  const { warnings } = findings({ ok: true, stdout: real }, where);
  const said = Object.fromEntries(warnings.map((w) => [w.code, w.message]));
  assert.equal(said.text_below_floor, '16x9 at 2 s: "Small print nobody reads" (#f) is 18 px, under the 28 px a phone can read. Set it to at least 28 px. See it with: filmkit snapshot bad 16x9 --at 2');
  assert.equal(said.film_silent, "16x9: the film runs 20 s with no sound. Give it sound from its motion in: films/bad/sound.json");
  assert.match(said.line_unread, /^16x9 at 1 s: "A line that goes by far too fast to read" \(#e\) is on screen 0\.5 s, under the 2\.63 s/);
  for (const w of warnings.filter((w) => w.time !== undefined && w.code !== "film_silent")) assert.ok(w.message.endsWith(`See it with: filmkit snapshot bad 16x9 --at ${w.time}`), w.code);
  assert.doesNotMatch(Object.values(said).join("\n"), /references\//);
});

test("a rule without a catalogue entry keeps HyperFrames' message and fix hint, at the film's own file", () => {
  const lint = findings({ ok: true, stdout: real }, where).warnings.find((w) => w.code === "css_transition_used");
  assert.equal(lint?.message, "16x9: films/bad/index.html:17: CSS declaration `transition: opacity 1s` runs on the browser clock and cannot be seeked deterministically across render workers. Keep the class or attribute swap for state; put the visual change on the paused GSAP timeline.");
  const timed = { code: "escaped_container", severity: "error", time: 3.1416, selector: "#x .node", message: "Element is far outside its offset parent", sourceFile: "kit/scenes/mesh.html" };
  const [error] = findings({ ok: false, stdout: JSON.stringify({ layout: { findings: [timed] } }) }, where).errors;
  assert.deepEqual(error, {
    code: "escaped_container",
    selector: "#x .node",
    time: 3.14,
    message: "16x9 at 3.14 s: #x .node: Element is far outside its offset parent. See it with: filmkit snapshot bad 16x9 --at 3.14",
    fix: "filmkit snapshot bad 16x9 --at 3.14",
  });
});

// Without npx on the PATH, anything that runs HyperFrames exits 3: a 0 proves nothing ran.
const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
/** @param {string[]} args @param {string} cwd */
const offline = (args, cwd) => spawnSync(process.execPath, [CLI, ...args], { cwd, env: { ...process.env, PATH: "/nonexistent" }, encoding: "utf8" });
const warning = { code: "film_silent", message: "no sound" };

/** A studio whose hook film passed in 16x9 with these inputs. */
function passedHook() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "filmkit-check-")));
  cpSync(new URL("fixtures/studio", import.meta.url), dir, { recursive: true });
  const studio = openStudio(dir);
  const film = openFilm(studio, "hook");
  const hash = formatHash(studio, film, "16x9");
  mkdirSync(join(dir, "build/hook/16x9"), { recursive: true });
  writeFileSync(join(dir, "build/hook/16x9/.filmkit-hash"), JSON.stringify({ hash, warnings: [warning] }));
  return { dir, film, hash };
}

test("an unchanged format that passed is skipped, with the warnings it passed with", () => {
  const { dir } = passedHook();
  const { status, stdout, stderr } = offline(["check", "hook", "16x9", "--json"], dir);
  assert.equal(status, 0, stderr);
  assert.match(stderr, /^16x9 unchanged ✓$/m);
  const { ok, formats } = JSON.parse(stdout);
  assert.equal(ok, true);
  assert.deepEqual(formats, [{ format: "16x9", dir: join(dir, "build/hook/16x9"), ok: true, errors: [], warnings: [warning] }]);
});

test("a changed film, another format or --force is checked again", () => {
  for (const args of [["check", "hook", "16x9", "--force"], ["check", "hook", "1x1"]]) {
    assert.equal(offline(args, passedHook().dir).status, 3, String(args));
  }
  const { dir, film } = passedHook();
  writeFileSync(join(film.dir, "index.html"), "\n", { flag: "a" });
  assert.equal(offline(["check", "hook", "16x9"], dir).status, 3);
});

test("render keeps an MP4 made from the same inputs, and redoes a missing, changed or forced one", () => {
  const { dir, hash } = passedHook();
  mkdirSync(join(dir, "renders"));
  writeFileSync(join(dir, "renders/hook-16x9.mp4"), "mp4");
  writeFileSync(join(dir, "build/hook/render-16x9.json"), JSON.stringify({ hash, bytes: 3 }));
  const { status, stdout, stderr } = offline(["render", "hook", "16x9", "--json"], dir);
  assert.equal(status, 0, stderr);
  assert.match(stderr, /hook-16x9\.mp4 unchanged$/m);
  assert.deepEqual(JSON.parse(stdout).renders, [{ format: "16x9", path: join(dir, "renders/hook-16x9.mp4"), seconds: 6, bytes: 3 }]);
  assert.equal(offline(["render", "hook", "16x9", "--force"], dir).status, 3);
  writeFileSync(join(dir, "renders/hook-16x9.mp4"), "half an mp4");
  assert.equal(offline(["render", "hook", "16x9"], dir).status, 3);
});

test("a long text is cut at a word to a label", () => {
  const long = { code: "clipped_text", severity: "error", time: 1, selector: "#p", text: "A paragraph far too long to name a finding by, all of it" };
  const [error] = findings({ ok: false, stdout: JSON.stringify({ layout: { findings: [long] } }) }, where).errors;
  assert.match(error.message, /^16x9 at 1 s: "A paragraph far too long to name a…" \(#p\) is cut off by its own box\./);
});
