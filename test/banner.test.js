import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { banner, pear } from "../src/cli/banner.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

/** A terminal of the given colour depth. @param {number} depth */
const tty = (depth) => ({ isTTY: true, getColorDepth: () => depth });

test("the banner is ANGLE FILMKIT in Pear, at the terminal's colour depth", () => {
  assert.match(banner(false, tty(24), {}), /^\x1b\[1;38;2;227;239;38m╱◣ ANGLE FILMKIT\x1b\[0m/);
  assert.match(banner(false, tty(8), {}), /^\x1b\[1;38;5;190m/);
  assert.match(banner(false, tty(4), {}), /^\x1b\[1;93m/);
});

test("the banner never shows with --json, on a pipe, without colour, or with NO_COLOR or FORCE_COLOR=0", () => {
  assert.equal(banner(true, tty(24), {}), "");
  assert.equal(banner(false, { isTTY: false, getColorDepth: () => 24 }, { FORCE_COLOR: "3" }), "");
  assert.equal(banner(false, tty(1), {}), "");
  assert.equal(banner(false, tty(24), { NO_COLOR: "1" }), "");
  assert.equal(banner(false, tty(24), { FORCE_COLOR: "0" }), "");
});

test("help on a pipe has no banner, even when an agent harness sets FORCE_COLOR", () => {
  const { status, stdout } = spawnSync(process.execPath, [CLI, "--help"], { env: { ...process.env, FORCE_COLOR: "3" }, encoding: "utf8" });
  assert.equal(status, 0);
  assert.match(stdout, /^usage: filmkit /);
});

test("pear colours a walkthrough's text where the banner would show, and leaves it plain where it wouldn't", () => {
  assert.equal(pear("filmkit check hello", tty(24), {}), "\x1b[38;2;227;239;38mfilmkit check hello\x1b[39m");
  assert.equal(pear("filmkit check hello", tty(24), { NO_COLOR: "1" }), "filmkit check hello");
  assert.equal(pear("filmkit check hello", { isTTY: false }, {}), "filmkit check hello");
});
