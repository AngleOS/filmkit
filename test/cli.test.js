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

test("no command prints the usage and exits non-zero", () => {
  assert.equal(filmkit([]).status, 1);
});

test("a failure exits non-zero, and --json says why on stdout", () => {
  const { status, stdout, stderr } = filmkit(["check", "smoke", "--json"], tmpdir());
  assert.equal(status, 1);
  assert.match(stderr, /^filmkit: no filmkit\.json/);
  assert.deepEqual(Object.keys(JSON.parse(stdout)), ["ok", "error"]);
});

test("unknown commands, films, formats and options fail without running anything", () => {
  assert.match(filmkit(["dance"]).stderr, /unknown command "dance"/);
  assert.match(filmkit(["check", "nope"]).stderr, /no films\/nope\/index\.html/);
  assert.match(filmkit(["check", "hook", "2x1"]).stderr, /unknown format 2x1/);
  assert.match(filmkit(["check", "hook", "--fast"]).stderr, /Unknown option '--fast'/);
});
