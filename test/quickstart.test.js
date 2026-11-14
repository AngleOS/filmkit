import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(ROOT, "src/cli/index.js");
const SPEC = /^npx -y (?:github:AngleOS\/filmkit|filmkit) /;
// These start HyperFrames' Chrome (or a server, for preview), so they run only with FILMKIT_RENDER=1, as CI's films job does.
const NEEDS_CHROME = /^npx -y \S+ (?:check|contact|render|snapshot|stills|preview)\b/;
const RENDER = process.env.FILMKIT_RENDER === "1";

const DOCS = ["README.md", ...readdirSync(join(ROOT, "docs")).filter((name) => name.endsWith(".md")).map((name) => `docs/${name}`)];

/** The ```sh block after each quickstart marker in a page. @param {string} page */
function quickstarts(page) {
  const text = readFileSync(join(ROOT, page), "utf8");
  return [...text.matchAll(/<!-- quickstart -->\n```sh\n([\s\S]*?)```/g)].map((match) => match[1]);
}

const blocks = [...new Set(DOCS.flatMap(quickstarts))];

// The real npx, for what filmkit itself runs through it (HyperFrames).
const NPX = (process.env.PATH ?? "").split(delimiter).map((dir) => join(dir, "npx")).find((path) => existsSync(path)) ?? "npx";

/** Runs a block in a clean temp dir, where `npx -y <filmkit's spec>` is this checkout. @param {string} block */
function run(block) {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-quickstart-"));
  const bin = join(dir, ".bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "npx"), `#!/bin/sh
case "$1 $2" in
  "-y github:AngleOS/filmkit" | "-y filmkit") shift 2; exec "${process.execPath}" "${CLI}" "$@" ;;
esac
exec "${NPX}" "$@"
`);
  chmodSync(join(bin, "npx"), 0o755);
  const work = join(dir, "work");
  mkdirSync(work);
  const script = RENDER ? block : block.split("\n").filter((line) => !NEEDS_CHROME.test(line)).join("\n");
  return spawnSync("sh", ["-ec", script], { cwd: work, encoding: "utf8", env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` } });
}

test("the README and getting started have a quickstart, and they're the same commands", () => {
  assert.equal(quickstarts("README.md").length, 1);
  assert.deepEqual(quickstarts("docs/getting-started.md"), quickstarts("README.md"));
});

test("every quickstart command is filmkit's, through npx, or a cd", () => {
  for (const block of blocks) {
    for (const line of block.split("\n").filter(Boolean)) assert.ok(SPEC.test(line) || /^cd \S+$/.test(line), line);
  }
});

for (const block of blocks) {
  test(`the quickstart runs verbatim in a clean dir${RENDER ? "" : " (without Chrome's commands)"}: ${block.split("\n")[0]}`, { timeout: 30 * 60_000 }, () => {
    const { status, stdout, stderr } = run(block);
    assert.equal(status, 0, `${stdout}\n${stderr}`);
  });
}
