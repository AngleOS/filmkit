import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { image } from "../src/mcp/server.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const EXAMPLES = fileURLToPath(new URL("../examples/studio", import.meta.url));
const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

// HyperFrames stands in as an `npx` on the PATH: `check --json` passes with no findings, and `snapshot` writes a 1×1
// PNG for each --at time, named as HyperFrames names its frames. Every call is logged, so a test can see the flags.
const FAKE_NPX = `#!/usr/bin/env node
const { appendFileSync, mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const [, , , , command, ...args] = process.argv; // node, this file, --yes, hyperframes@<pin>
appendFileSync(process.env.FAKE_LOG, [command, ...args].join(" ") + "\\n");
if (command === "check") console.log(JSON.stringify({ ok: true, lint: { findings: [] } }));
if (command === "snapshot") {
  const out = args[args.indexOf("-o") + 1];
  mkdirSync(out, { recursive: true });
  const at = args.find((a) => a.startsWith("--at=")).slice(5).split(",");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  at.forEach((t, i) => writeFileSync(join(out, \`frame-\${String(i).padStart(2, "0")}-at-\${t}s.png\`), png));
}
`;

/** @type {Client} */
let client;
/** @type {string} */
let studio;
/** @type {string} */
let log;

before(async () => {
  studio = mkdtempSync(join(tmpdir(), "filmkit-mcp-"));
  cpSync(EXAMPLES, studio, { recursive: true });
  const bin = mkdtempSync(join(tmpdir(), "filmkit-mcp-bin-"));
  writeFileSync(join(bin, "npx"), FAKE_NPX);
  chmodSync(join(bin, "npx"), 0o755);
  log = join(bin, "calls.log");
  writeFileSync(log, "");
  const env = { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, FAKE_LOG: log };
  const transport = new StdioClientTransport({ command: process.execPath, args: [CLI, "mcp", "--studio", studio], env, stderr: "pipe" });
  client = new Client({ name: "filmkit-test", version: "0" });
  await client.connect(transport);
});

after(() => client.close());

/** @param {string} name @param {Record<string, unknown>} [args] */
async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return /** @type {{ isError?: boolean, content: { type: string, text?: string, data?: string, mimeType?: string }[] }} */ (result);
}

/** @param {Awaited<ReturnType<typeof call>>} result */
const json = (result) => JSON.parse(/** @type {string} */ (result.content[0].text));

test("the server is Angle Filmkit's, and lists its tools", async () => {
  assert.deepEqual([client.getServerVersion()?.name, client.getServerVersion()?.title], ["filmkit", "Angle Filmkit"]);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["check_film", "list_films", "list_scenes", "new_film", "snapshot_film"]);
  const scenes = tools.find((t) => t.name === "list_scenes");
  assert.match(scenes?.description ?? "", /angle, default, paper/);
  assert.match(scenes?.description ?? "", /"credit": false/);
});

test("list_films gives each film's formats, loop and length", async () => {
  const { films } = json(await call("list_films"));
  const smoke = films.find((/** @type {{ name: string }} */ f) => f.name === "smoke");
  assert.deepEqual(smoke, { name: "smoke", formats: ["16x9", "9x16", "1x1", "4x5"], loop: false, duration: smoke.duration });
  assert.ok(smoke.duration > 0);
  assert.equal(films.find((/** @type {{ name: string }} */ f) => f.name === "loop").loop, true);
});

test("list_scenes gives a scene's variables", async () => {
  const { scenes } = json(await call("list_scenes", { name: "bars" }));
  assert.deepEqual(scenes.map((/** @type {{ name: string }} */ s) => s.name), ["bars"]);
  assert.ok(scenes[0].variables.length);
});

test("new_film makes a film from a template, which list_films then lists", async () => {
  const result = json(await call("new_film", { name: "launch", template: "poster" }));
  assert.deepEqual([result.ok, result.film, result.template], [true, "launch", "poster"]);
  assert.ok(result.files.every((/** @type {string} */ f) => f.startsWith(studio) && existsSync(f)));
  assert.ok(json(await call("list_films")).films.some((/** @type {{ name: string }} */ f) => f.name === "launch"));
});

test("a CLI error is a tool error with the CLI's message, and its fix", async () => {
  const result = await call("check_film", { film: "nope" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text ?? "", /^No film called "nope" in this studio\. .* Make it with: filmkit new nope$/);
});

test("check_film checks the smoke film in each format", { skip: !hasFfmpeg && "no ffmpeg: the smoke film's sound needs it" }, async () => {
  const result = await call("check_film", { film: "smoke", formats: ["16x9", "9x16"] });
  assert.equal(result.isError, undefined);
  const checked = json(result);
  assert.equal(checked.ok, true);
  assert.deepEqual(checked.formats.map((/** @type {{ format: string, ok: boolean }} */ f) => [f.format, f.ok]), [["16x9", true], ["9x16", true]]);
  assert.equal(checked.sound.built, true);
});

test("snapshot_film returns a PNG per time, only the times asked for, and a text item with their paths", async () => {
  const result = await call("snapshot_film", { film: "smoke", format: "1x1", at: [1, 2.5] });
  assert.equal(result.isError, false);
  const [text, ...images] = result.content;
  assert.deepEqual(json({ content: [text] }).frames.map((/** @type {{ t: number }} */ f) => f.t), [1, 2.5]);
  assert.deepEqual(images.map((i) => [i.type, i.mimeType]), [["image", "image/png"], ["image", "image/png"]]);
  assert.equal(Buffer.from(images[0].data ?? "", "base64").subarray(1, 4).toString(), "PNG");
  assert.match(readFileSync(log, "utf8"), /^snapshot -o \S+snaps-1x1 --at=1,2\.5 --no-end --describe=false$/m);
});

test("snapshot_film takes at most 12 times", async () => {
  const result = await call("snapshot_film", { film: "smoke", at: Array.from({ length: 13 }, (_, i) => i) });
  assert.equal(result.isError, true);
});

test("a frame longer than 1568 px is scaled to fit, keeping its shape", { skip: !hasFfmpeg && "no ffmpeg" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-mcp-image-"));
  const path = join(dir, "wide.png");
  spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=red:s=1920x1080", "-frames:v", "1", path]);
  const png = Buffer.from(image(path).data, "base64");
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1568, 882]);
});
