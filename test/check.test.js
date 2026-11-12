import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
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

test("check reports HyperFrames' errors and warnings from every pass, without the info", () => {
  assert.deepEqual(findings({ ok: false, stdout: JSON.stringify(report) }), {
    ok: false,
    errors: [{ code: "text_box_overflow", message: "overflows", selector: "#src" }],
    warnings: [{ code: "subcomposition_blanks_before_host", message: "blank", selector: "#a" }],
  });
});

test("a clean report passes", () => {
  assert.deepEqual(findings({ ok: true, stdout: JSON.stringify({ ok: true, lint: { findings: [] } }) }), { ok: true, errors: [], warnings: [] });
});

test("no report is a failure, with the last word from HyperFrames' stderr", () => {
  const [error] = findings({ ok: false, stdout: "", stderr: "[hyperframes] probe\nError: Chrome crashed\n" }).errors;
  assert.deepEqual(error, { code: "no_report", message: "HyperFrames gave no report (Error: Chrome crashed). See what's missing with: filmkit doctor" });
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
