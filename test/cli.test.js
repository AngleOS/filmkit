import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const FIXTURE = fileURLToPath(new URL("fixtures/studio", import.meta.url));

/** @param {string[]} args @param {string} cwd @param {NodeJS.ProcessEnv} [env] */
const filmkit = (args, cwd = FIXTURE, env = process.env) => spawnSync(process.execPath, [CLI, ...args], { cwd, env, encoding: "utf8" });

function studioCopy() {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-cli-"));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

test("help lists every command and exits 0", () => {
  const { status, stdout } = filmkit(["--help"]);
  assert.equal(status, 0);
  for (const name of ["captions", "check", "preview", "render", "snapshot", "stills"]) assert.match(stdout, new RegExp(`^  ${name} <film>`, "m"));
});

test("no command prints the usage and exits 2", () => {
  assert.equal(filmkit([]).status, 2);
});

test("a usage error exits 2, and --json says why on stdout", () => {
  const { status, stdout, stderr } = filmkit(["check", "smoke", "--json"], tmpdir());
  assert.equal(status, 2);
  assert.match(stderr, /^filmkit: no filmkit\.json/);
  assert.deepEqual(Object.keys(JSON.parse(stdout)), ["ok", "error"]);
});

test("unknown commands, films, formats and options exit 2 without running anything", () => {
  for (const [args, message] of [
    [["dance"], /unknown command "dance"/],
    [["check", "nope"], /no films\/nope\/index\.html/],
    [["check", "hook", "2x1"], /unknown format 2x1/],
    [["check", "hook", "--fast"], /Unknown option '--fast'/],
  ]) {
    const { status, stderr } = filmkit(/** @type {string[]} */ (args));
    assert.equal(status, 2, String(args));
    assert.match(stderr, /** @type {RegExp} */ (message));
  }
});

test("global options may come before the command", () => {
  const { status, stdout } = filmkit(["--json", "--studio", tmpdir(), "check", "hook"]);
  assert.equal(status, 2);
  assert.match(JSON.parse(stdout).error, /no filmkit\.json in /);
});

test("the studio is found walking up from the cwd, or named with --studio", () => {
  assert.match(filmkit(["check", "nope"], `${FIXTURE}/films/hook/compositions`).stderr, /no films\/nope\/index\.html \(films: hook, plain\)/);
  assert.match(filmkit(["check", "nope", "--studio", FIXTURE], tmpdir()).stderr, /no films\/nope\/index\.html/);
});

test("captions writes the film's .srt and .vtt into renders/, and a film without captions gets none", () => {
  const dir = studioCopy();
  const page = join(dir, "films/plain/index.html");
  writeFileSync(page, readFileSync(page, "utf8").replace("</div>\n", `<div id="cc" data-composition-src="kit/scenes/captions.html" data-start="1" data-duration="3" data-variable-values='{"lines":"0.5-1.5 Hello."}'></div>\n$&`));
  const { status, stdout } = filmkit(["captions", "plain", "--json"], dir);
  assert.equal(status, 0);
  const result = JSON.parse(stdout);
  assert.deepEqual(result.lines, [{ start: 1.5, end: 2.5, text: "Hello." }]);
  assert.equal(readFileSync(result.srt, "utf8"), "1\n00:00:01,500 --> 00:00:02,500\nHello.\n");
  assert.match(readFileSync(result.vtt, "utf8"), /^WEBVTT\n/);
  const none = JSON.parse(filmkit(["captions", "hook", "--json"], dir).stdout);
  assert.deepEqual([none.srt, none.vtt, none.lines], [null, null, []]);
  assert.ok(!existsSync(join(dir, "renders/hook.srt")));
});

test("stills needs a time before it checks anything", () => {
  const { status, stderr } = filmkit(["stills", "hook"]);
  assert.equal(status, 2);
  assert.match(stderr, /say when, in seconds/);
});

test("doctor reports each requirement and exits 3 when one is missing", () => {
  const { status, stdout } = filmkit(["doctor", "--json"], FIXTURE, { ...process.env, PATH: "/nonexistent" });
  assert.equal(status, 3);
  const { ok, checks } = JSON.parse(stdout);
  assert.equal(ok, false);
  assert.deepEqual(checks.map((/** @type {{ name: string, ok: boolean }} */ c) => [c.name, c.ok]), [["Node.js", true], ["ffmpeg", false], ["HyperFrames", false]]);
});
