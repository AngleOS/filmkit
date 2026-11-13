import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { lastWords } from "../src/hyperframes.js";
import { line, progress, renderStage } from "../src/progress.js";

/** A clock the test moves, and the lines and terminal writes a progress makes. @param {boolean} isTTY */
function harness(isTTY) {
  const clock = { at: 0 };
  /** @type {unknown[][]} */
  const logged = [];
  let written = "";
  const stream = { isTTY, columns: 60, write: (/** @type {string} */ s) => (written += s) };
  const live = progress((...lines) => logged.push(lines), { stream, now: () => clock.at });
  return { clock, logged, live, written: () => written };
}

test("off a terminal, each step prints one line as it starts, with its frames", () => {
  const { logged, live } = harness(false);
  live.step("16x9", "rendering");
  live.step("16x9", "capturing", { done: 1, total: 240 });
  live.step("16x9", "capturing", { done: 2, total: 240 });
  live.step("9x16", "checking");
  live.log("16x9 ✓ 2.0 s");
  live.close();
  assert.deepEqual(logged, [["16x9 rendering"], ["16x9 capturing 240 frames"], ["9x16 checking"], ["16x9 ✓ 2.0 s"]]);
});

test("in a terminal, the running formats are lines on stderr, redrawn below each lasting line", () => {
  const { clock, logged, live, written } = harness(true);
  live.step("16x9", "checking");
  clock.at = 5000;
  live.step("1x1", "checking");
  assert.equal(written(), "16x9  checking  0:00\n\r\x1b[1A\x1b[J16x9  checking  0:05\n1x1  checking  0:00\n");
  const before = written().length;
  live.end("16x9");
  live.log("16x9 ✓ 5.0 s");
  assert.deepEqual(logged, [["16x9 ✓ 5.0 s"]]);
  // two lines erased and one redrawn, then that one erased and redrawn around the log
  assert.equal(written().slice(before), "\r\x1b[2A\x1b[J1x1  checking  0:00\n\r\x1b[1A\x1b[J1x1  checking  0:00\n");
  live.close();
  assert.ok(written().endsWith("\r\x1b[1A\x1b[J"));
});

test("in a terminal, new frames wait for the next second's redraw; a new step is drawn at once", () => {
  const { live, written } = harness(true);
  live.step("16x9", "capturing", { done: 1, total: 240 });
  const drawn = written();
  live.step("16x9", "capturing", { done: 2, total: 240 });
  assert.equal(written(), drawn);
  live.step("16x9", "encoding", { done: 2, total: 240 });
  assert.match(written().slice(drawn.length), /16x9 {2}encoding/);
  live.close();
});

test("a line is cut to the terminal's width, so a redraw never wraps", () => {
  const { live, written } = harness(true);
  live.step("16x9", "a step with a name far longer than sixty columns can show on one line");
  live.close();
  assert.equal(written().split("\n")[0].length, 59);
});

test("a line shows the frames and, once the rate settles, the time left", () => {
  const row = { step: "capturing", started: 0, stepStarted: 10_000, done: 60, total: 240 };
  assert.equal(line("9x16", row, 11_000), "9x16  capturing  ▓▓░░░░░░  frame 60/240  0:11");
  assert.equal(line("9x16", row, 30_000), "9x16  capturing  ▓▓░░░░░░  frame 60/240  0:30  1:00 left");
  assert.equal(line("9x16", { step: "checking", started: 0, stepStarted: 0 }, 75_000), "9x16  checking  1:15");
});

test("renderStage reads HyperFrames' progress lines and nothing else", () => {
  assert.deepEqual(renderStage('@hf-progress {"code":"capture","done":195,"total":240,"pct":70}'), { step: "capturing", done: 195, total: 240 });
  assert.deepEqual(renderStage('@hf-progress {"code":"assemble","done":0,"total":8,"pct":90}'), { step: "assembling" });
  assert.deepEqual(renderStage('@hf-progress {"code":"compile","pct":5}'), { step: "compiling", done: undefined, total: undefined });
  assert.equal(renderStage("  ████░░░  70%  Streaming frame 195/240"), null);
  assert.equal(renderStage("@hf-progress {broken"), null);
});

test("a failed run's last words come from its stderr, else its stdout without the progress", () => {
  assert.deepEqual(lastWords({ stdout: "◆ Rendering\n", stderr: "a\nb\nc\nError: no space left\n" }), ["b", "c", "Error: no space left"]);
  assert.deepEqual(lastWords({ stdout: "◆ Rendering\n  ███░░  12%  Capturing\n@hf-progress {}\n✗ Chrome crashed\n", stderr: "" }), ["◆ Rendering", "✗ Chrome crashed"]);
});

// A stand-in for `npx --yes hyperframes@… <command> …`: check passes, and writes its arguments to FAKE_ARGS when set;
// render reports two frames and writes its MP4, unless FAKE_RENDER_FAILS is set; snapshot fails.
const NPX = `#!/bin/sh
case "$3" in
  check) [ -n "$FAKE_ARGS" ] && echo "$@" > "$FAKE_ARGS"; echo '{"ok":true}' ;;
  render)
    for out; do :; done
    if [ -n "$FAKE_RENDER_FAILS" ]; then echo "Error: no space left on device" >&2; exit 1; fi
    echo '@hf-progress {"code":"compile","pct":5}'
    echo '@hf-progress {"code":"capture","done":1,"total":2,"pct":40}'
    echo '@hf-progress {"code":"capture","done":2,"total":2,"pct":80}'
    echo '@hf-progress {"code":"encode","done":2,"total":2,"pct":90}'
    printf mp4 > "$out" ;;
  snapshot) echo "Error: Chrome crashed" >&2; exit 1 ;;
  *) exit 9 ;;
esac
`;
const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

/** Runs the CLI in a copy of the fixture studio, with the stand-in as npx. @param {string[]} args @param {object} [env] */
function withFakeHyperframes(args, env = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "filmkit-progress-")));
  cpSync(new URL("fixtures/studio", import.meta.url), dir, { recursive: true });
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, "bin/npx"), NPX);
  chmodSync(join(dir, "bin/npx"), 0o755);
  const PATH = `${join(dir, "bin")}:${process.env.PATH}`;
  return spawnSync(process.execPath, [CLI, ...args], { cwd: dir, env: { ...process.env, PATH, ...env }, encoding: "utf8" });
}

test("off a terminal, render prints each step of the render as it starts", () => {
  const { status, stdout, stderr } = withFakeHyperframes(["render", "plain", "16x9"]);
  assert.equal(status, 0, stderr);
  const lines = stdout.replace(/✓ [\d.]+ s/, "✓ 0.1 s").split("\n").filter((l) => l.startsWith("16x9 "));
  assert.deepEqual(lines, ["16x9 checking", "16x9 ✓ 0.1 s", "16x9 rendering", "16x9 compiling", "16x9 capturing 2 frames", "16x9 encoding 2 frames"]);
});

test("with --json, stdout holds only the result, and a failed render says why", () => {
  const { status, stdout, stderr } = withFakeHyperframes(["render", "plain", "16x9", "--json"], { FAKE_RENDER_FAILS: "1" });
  assert.equal(status, 4, stderr);
  assert.deepEqual(JSON.parse(stdout), { film: "plain", ok: false, renders: [], captions: { srt: null, vtt: null }, failed: ["16x9"] });
  assert.match(stderr, /^16x9 ✗ render failed\n {2}Error: no space left on device$/m);
});

test("a seam whose frames didn't render says why, in HyperFrames' words", () => {
  const { status, stdout, stderr } = withFakeHyperframes(["check", "hook", "--json"]);
  assert.equal(status, 1, stderr);
  assert.deepEqual(JSON.parse(stdout).formats[0].seam, { ok: false, error: "the seam frames didn't render: Error: Chrome crashed" });
  assert.match(stderr, /^ {2}✗ seam_unmeasured: 9x16: the seam couldn't be measured: the seam frames didn't render: Error: Chrome crashed\. See what's missing with: filmkit doctor$/m);
});

test("check has HyperFrames flag text under the safe box, sampled two thirds into the film without scenes", () => {
  const args = join(realpathSync(mkdtempSync(join(tmpdir(), "filmkit-args-"))), "args");
  const { status, stderr } = withFakeHyperframes(["check", "plain", "16x9", "--force"], { FAKE_ARGS: args });
  assert.equal(status, 0, stderr);
  assert.match(readFileSync(args, "utf8"), / check --json --caption-zone x0=0;y0=0\.95;x1=1;y1=1;seek=0\.6667$/m);
});
