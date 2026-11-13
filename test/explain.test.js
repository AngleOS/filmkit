import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { hyperframesWhy } from "../src/cli/commands/explain.js";
import { HYPERFRAMES, pinnedPackage } from "../src/hyperframes.js";

const PACKAGE = fileURLToPath(new URL("fixtures/hyperframes", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
/** @param {string[]} args @param {string} cache npm's cache, where npx keeps HyperFrames */
const filmkit = (args, cache) => spawnSync(process.execPath, [CLI, ...args], { env: { ...process.env, npm_config_cache: cache }, encoding: "utf8" });
const emptyCache = () => mkdtempSync(join(tmpdir(), "filmkit-npm-"));

test("a HyperFrames rule its references define is explained by their line", () => {
  assert.deepEqual(hyperframesWhy("missing_data_no_timeline", PACKAGE), {
    why: "A root or host with no timeline: add `data-no-timeline`, or every render waits 45 s. (HyperFrames' hyperframes/references/format.md)",
    source: "hyperframes-reference",
  });
});

test("a rule the references only mention is explained by the sentence that names it", () => {
  assert.equal(
    hyperframesWhy("sweep_static", PACKAGE)?.why,
    "If a 3s+ composition shows no visible change across every sample, `check` fails with `sweep_static`: the seek is not driving the page. (HyperFrames' hyperframes/references/format.md)",
  );
});

test("a rule the references don't name says it's HyperFrames', that its finding has the fix, and what its family checks", () => {
  assert.deepEqual(hyperframesWhy("gsap_infinite_repeat", PACKAGE), {
    why: `A ${HYPERFRAMES} rule. Its finding in \`filmkit check\` carries the fix. It's one of the lint checks, which read the film's HTML before it plays and flag markup, timing and GSAP mistakes.`,
    source: "hyperframes",
  });
  assert.match(hyperframesWhy("motion_frozen", PACKAGE)?.why ?? "", /one of the motion checks/);
});

test("a code is HyperFrames' however its package writes it: minified, or passed to a helper", () => {
  assert.match(hyperframesWhy("runtime_script_error", PACKAGE)?.why ?? "", /one of the runtime checks/);
  assert.match(hyperframesWhy("motion_spec_invalid", PACKAGE)?.why ?? "", /one of the motion checks/);
});

test("a passing mention in the references isn't taken for the why", () => {
  assert.deepEqual(hyperframesWhy("caption_zone_collision", PACKAGE)?.source, "hyperframes");
});

test("the codes the pinned HyperFrames' check emits all explain, once it's fetched", { skip: !pinnedPackage() && "HyperFrames isn't fetched here" }, () => {
  for (const code of ["motion_spec_invalid", "runtime_script_error", "check_runtime_failure", "content_overlap", "css_transition_used"]) {
    const { status, stdout } = filmkit(["explain", code, "--json"], process.env.npm_config_cache ?? join(homedir(), ".npm"));
    assert.equal(status, 0, code);
    assert.equal(JSON.parse(stdout).code, code);
  }
});

test("a code HyperFrames doesn't have is no rule", () => {
  assert.equal(hyperframesWhy("content_overlapp", PACKAGE), null);
  assert.equal(hyperframesWhy("nope", null), null);
});

test("the pinned package is found in npx's cache, and only at the pinned version", () => {
  const cache = emptyCache();
  assert.equal(pinnedPackage(cache), null);
  cpSync(PACKAGE, join(cache, "_npx/1d3cf7f692a53f8f/node_modules/hyperframes"), { recursive: true });
  assert.equal(pinnedPackage(cache), join(cache, "_npx/1d3cf7f692a53f8f/node_modules/hyperframes"));
  assert.equal(filmkit(["explain", "missing_data_no_timeline", "--json"], cache).status, 0);
  assert.equal(JSON.parse(filmkit(["explain", "missing_data_no_timeline", "--json"], cache).stdout).source, "hyperframes-reference");
  assert.equal(filmkit(["explain", "content_overlapp"], cache).status, 2);
});

test("before HyperFrames is fetched, explain still answers for a HyperFrames code, and Filmkit's own rules are Filmkit's", () => {
  const cache = emptyCache();
  const hf = filmkit(["explain", "gsap_infinite_repeat", "--json"], cache);
  assert.equal(hf.status, 0);
  assert.deepEqual(JSON.parse(hf.stdout).source, "hyperframes");
  const own = JSON.parse(filmkit(["explain", "content_overlap", "--json"], cache).stdout);
  assert.deepEqual([own.source, own.code], ["filmkit", "content_overlap"]);
  assert.match(own.why, /^Two text blocks on top of each other/);
});
