import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const FIXTURE = fileURLToPath(new URL("fixtures/studio", import.meta.url));

/** @param {string[]} args @param {string} cwd */
const filmkit = (args, cwd = FIXTURE) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });

test("help lists every command and exits 0", () => {
  const { status, stdout } = filmkit(["--help"]);
  assert.equal(status, 0);
  for (const name of ["check", "preview", "render", "snapshot"]) assert.match(stdout, new RegExp(`^  ${name} <film>`, "m"));
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
