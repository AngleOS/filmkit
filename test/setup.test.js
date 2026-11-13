import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { nodeSupported } from "../src/cli/commands/doctor.js";
import { agentPrompt } from "../src/cli/commands/prompt.js";
import { fromFlags } from "../src/cli/commands/setup.js";
import { STEPS, setup, studioDir } from "../src/setup.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const ok = (/** @type {string} */ name) => ({ name, ok: true, detail: "ok" });

/**
 * The steps that reach outside the studio, stubbed, each call recorded.
 * @param {Partial<import("../src/setup.js").Steps>} [over]
 */
function stubs(over = {}) {
  /** @type {Record<string, any[]>} */
  const calls = { agents: [], brand: [], check: [], contact: [], open: [], fetchChrome: [] };
  /** @type {import("../src/setup.js").Steps} */
  const steps = {
    requirements: () => [ok("Node.js"), ok("ffmpeg"), ok("HyperFrames"), ok("Chrome")],
    fetchChrome: () => void calls.fetchChrome.push(true),
    agents: async (ctx) => (calls.agents.push(ctx.args), { ok: true, tools: [] }),
    brand: async (ctx) => (calls.brand.push(ctx.options), { ok: true }),
    check: async (ctx) => (calls.check.push(ctx.args), { ok: true }),
    contact: async (ctx) => (calls.contact.push(ctx.args), { ok: true, sheets: [{ format: "16x9", path: "/sheet.png" }] }),
    open: (path) => void calls.open.push(path),
    ...over,
  };
  return { steps, calls };
}

/** setup as `--yes` runs it, in a temp HOME and cwd, with `flags` as parsed options. */
async function setupYes(/** @type {Record<string, any>} */ flags, steps = stubs().steps) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "filmkit-setup-")));
  const { HOME } = process.env;
  const cwd = process.cwd();
  process.env.HOME = home;
  process.chdir(home);
  /** @type {string[]} */
  const lines = [];
  try {
    const brand = flags["no-brand"] ? null : { url: flags["brand-url"], logo: flags.logo, accent: flags.accent, ground: flags.ground, yes: true };
    const out = { log: (/** @type {unknown[]} */ ...l) => void lines.push(l.join(" ")), heading: () => {}, json: true };
    return { home, lines, result: await setup({ ask: fromFlags(flags), brand, open: false }, out, steps) };
  } finally {
    process.chdir(cwd);
    process.env.HOME = HOME;
  }
}

test("setup --yes makes the studio in the brand's name and the first film, checked, with its contact sheet", async () => {
  const { steps, calls } = stubs();
  const { home, result } = await setupYes({ name: "Acme Rockets", "brand-url": "https://acme.test" }, steps);
  const studio = join(home, "acme-rockets-films");
  assert.equal(result.ok, true);
  assert.equal(result.studio.studio, studio);
  assert.equal(JSON.parse(readFileSync(join(studio, "filmkit.json"), "utf8")).name, "Acme Rockets");
  assert.match(readFileSync(join(studio, "films/hello/index.html"), "utf8"), /Acme Rockets/);
  assert.match(readFileSync(join(studio, "CLAIMS.md"), "utf8"), /^## hello$/m);
  assert.deepEqual(calls.agents, [[]], "--agents auto: every tool installed");
  assert.deepEqual(calls.brand, [{ studio, name: "Acme Rockets", "from-url": "https://acme.test", logo: undefined, accent: undefined, ground: undefined, yes: true }]);
  assert.deepEqual([calls.check, calls.contact, calls.open], [[["hello"]], [["hello", "16x9"]], []]);
  assert.equal(result.film.contact.sheets[0].path, "/sheet.png");
});

test("without --studio or --name, setup stops after the agent tools: the agent asks for the brand first", async () => {
  const { steps, calls } = stubs();
  const { home, result, lines } = await setupYes({ agents: "cursor,zed", "no-brand": true, "no-first-film": true }, steps);
  assert.equal(result.ok, true);
  assert.equal(result.studio, null);
  assert.deepEqual(calls.agents, [["cursor", "zed"]]);
  assert.deepEqual(calls.brand, []);
  assert.ok(!existsSync(join(home, "filmkit.json")));
  assert.ok(lines.some((l) => l.includes("filmkit setup --studio <dir> --name <brand>")));
});

test("run again, setup keeps the studio and the film; --agents none and --no-brand skip their steps", async () => {
  const { home } = await setupYes({ studio: "films-here", name: "Acme" });
  const { steps, calls } = stubs();
  const studio = join(home, "films-here");
  const { result } = await setupYes({ studio, agents: "none", "no-brand": true }, steps);
  assert.equal(result.ok, true);
  assert.deepEqual([result.studio.ok, result.studio.files, result.studio.name], [true, [], "Acme"]);
  assert.deepEqual([calls.agents, calls.brand, calls.check], [[], [], [["hello"]]]);
});

test("a missing Chrome is fetched once; a missing ffmpeg stops setup with exit 3", async () => {
  let fetched = false;
  const chrome = stubs({
    requirements: () => [ok("Node.js"), ok("ffmpeg"), ok("HyperFrames"), { ...ok("Chrome"), ok: fetched }],
    fetchChrome: () => void (fetched = true),
  });
  assert.equal((await setupYes({ "no-brand": true }, chrome.steps)).result.ok, true);
  assert.equal(fetched, true);

  const ffmpeg = stubs({ requirements: () => [ok("Node.js"), { name: "ffmpeg", ok: false, detail: "not on the PATH" }, ok("Chrome")] });
  const { result } = await setupYes({ name: "Acme" }, ffmpeg.steps);
  assert.deepEqual([result.ok, result.exit, ffmpeg.calls.fetchChrome, ffmpeg.calls.agents], [false, 3, [], []]);
});

test("a first film that fails its check fails setup, with no contact sheet", async () => {
  const { steps, calls } = stubs({ check: async () => ({ ok: false }) });
  const { result } = await setupYes({ name: "Acme", "no-brand": true }, steps);
  assert.deepEqual([result.ok, result.exit, calls.contact], [false, 1, []]);
});

test("setup's brand step is filmkit brand, the palette from --accent, without brand's own next step", async () => {
  const { steps } = stubs({ brand: STEPS.brand });
  const { home, result, lines } = await setupYes({ name: "Acme", accent: "#ff5a1f", ground: "dark", agents: "none", "no-first-film": true }, steps);
  assert.equal(result.brand.ok, true);
  assert.equal(JSON.parse(readFileSync(join(home, "acme-films/brand/theme/theme.json"), "utf8")).extends, "default");
  assert.equal(JSON.parse(readFileSync(join(home, "acme-films/filmkit.json"), "utf8")).theme, "brand/theme");
  assert.ok(!lines.some((l) => l.startsWith("Next:")), lines.join("\n"));
});

test("with only --studio, the brand step takes the studio's own name", async () => {
  const { home } = await setupYes({ studio: "films-here", name: "Acme", "no-brand": true, "no-first-film": true });
  const { steps } = stubs({ brand: STEPS.brand });
  const { result } = await setupYes({ studio: join(home, "films-here"), ground: "light", agents: "none", "no-first-film": true }, steps);
  assert.deepEqual([result.ok, result.brand.name, result.brand.palette.ground], [true, "Acme", "light"]);
});

test("with no brand flags, setup leaves the default theme and says how to make it the brand's", async () => {
  const { steps, calls } = stubs();
  const { result, lines } = await setupYes({ name: "Acme", "no-first-film": true }, steps);
  assert.deepEqual([result.ok, result.brand, calls.brand], [true, null, []]);
  assert.ok(lines.includes("· the default theme: make it yours with filmkit brand"));
});

test("in a terminal, the brand step runs filmkit brand even with no brand flags: it asks for the brand itself", async () => {
  const { steps, calls } = stubs();
  const dir = join(realpathSync(mkdtempSync(join(tmpdir(), "filmkit-setup-"))), "acme-films");
  const out = { log: () => {}, heading: () => {}, json: false };
  const ask = { ...fromFlags({ studio: dir, name: "Acme", agents: "none" }), firstFilm: async () => false };
  const result = await setup({ ask, brand: { yes: false }, open: false }, out, steps);
  assert.equal(result.ok, true);
  assert.deepEqual(calls.brand.map((o) => [o.name, o.yes]), [["Acme", false]]);
});

test("the studio's default folder is the brand's name, made plain", () => {
  assert.equal(studioDir("Acme Rockets, Inc."), "acme-rockets-inc-films");
  assert.equal(studioDir("Ångström"), "ngstr-m-films");
  assert.equal(studioDir("✨"), "brand-films");
});

test("setup --remove takes Filmkit out of the agent tools and leaves the studio alone", () => {
  const home = mkdtempSync(join(tmpdir(), "filmkit-remove-"));
  mkdirSync(join(home, ".cursor"));
  writeFileSync(join(home, "filmkit.json"), "{}\n");
  const env = { HOME: home, USERPROFILE: home, PATH: "" };
  /** @param {string[]} args */
  const filmkit = (args) => spawnSync(process.execPath, [CLI, ...args, "--json"], { cwd: home, env, encoding: "utf8" });
  assert.equal(filmkit(["agents", "cursor"]).status, 0);
  assert.ok(JSON.parse(readFileSync(join(home, ".cursor/mcp.json"), "utf8")).mcpServers.filmkit);
  const { status, stdout } = filmkit(["setup", "--remove"]);
  assert.equal(status, 0);
  const cursor = JSON.parse(stdout).tools.find((/** @type {{ id: string }} */ t) => t.id === "cursor");
  assert.equal(cursor.status, "removed");
  assert.equal(JSON.parse(readFileSync(join(home, ".cursor/mcp.json"), "utf8")).mcpServers?.filmkit, undefined);
  assert.equal(readFileSync(join(home, "filmkit.json"), "utf8"), "{}\n");
});

test("filmkit prompt prints the guide's prompt, only the fenced block", () => {
  const page = "# Title\n\nIntro.\n\n````text\nInstall it.\n\n```sh\nnpx x\n```\n````\n\n## After\n";
  assert.equal(agentPrompt(page), "Install it.\n\n```sh\nnpx x\n```");
  assert.equal(agentPrompt(page.replaceAll("\n", "\r\n")), "Install it.\n\n```sh\nnpx x\n```", "a page with Windows line endings");
  assert.throws(() => agentPrompt("# Title\n", "/p/guide.md"), { code: "prompt_missing", message: /^\/p\/guide\.md has no ````text block/ });
  const { status, stdout } = spawnSync(process.execPath, [CLI, "prompt"], { encoding: "utf8" });
  assert.equal(status, 0);
  assert.match(stdout, /^Install Angle Filmkit for me/);
  assert.match(stdout, /setup --remove/);
  assert.doesNotMatch(stdout, /````|^# /m);
});

test("Node 20.12 is the oldest supported: setup's prompts need its util.styleText", () => {
  for (const v of ["20.12.0", "20.19.5", "22.0.0", "26.1.0"]) assert.equal(nodeSupported(v), true, v);
  for (const v of ["18.19.0", "20.0.0", "20.11.1", "19.9.0"]) assert.equal(nodeSupported(v), false, v);
});

test("setup --ground takes dark or light, and anything else is a usage error before any step runs", () => {
  const { status, stdout } = spawnSync(process.execPath, [CLI, "setup", "--yes", "--ground", "grey", "--json"], { cwd: tmpdir(), encoding: "utf8" });
  assert.equal(status, 2);
  assert.equal(JSON.parse(stdout).code, "option_choice");
});
