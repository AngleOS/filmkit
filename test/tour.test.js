import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { initStudio, newFilm } from "../src/create.js";
import { openStudio } from "../src/studio.js";
import { fromFlags } from "../src/cli/commands/tour.js";
import { next, tour } from "../src/tour.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

/** A new studio for Acme in a temp directory. */
function studio() {
  const dir = join(realpathSync(mkdtempSync(join(tmpdir(), "filmkit-tour-"))), "acme-films");
  initStudio(dir, "Acme");
  return openStudio(dir);
}

/**
 * The steps that reach for HyperFrames, stubbed, each call recorded.
 * @param {Partial<import("../src/tour.js").Steps>} [over]
 */
function stubs(over = {}) {
  /** @type {Record<string, any[]>} */
  const calls = { check: [], contact: [], render: [], open: [] };
  /** @type {import("../src/tour.js").Steps} */
  const steps = {
    check: async (ctx) => (calls.check.push(ctx), { ok: true }),
    contact: async (ctx) => (calls.contact.push(ctx), { ok: true, sheets: [{ format: "16x9", path: "/sheet.png" }] }),
    render: async (ctx) => (calls.render.push(ctx), { ok: true, renders: [] }),
    open: (path) => void calls.open.push(path),
    ...over,
  };
  return { steps, calls };
}

/** The tour with every step answered by `ask`, its lines and headings kept. */
async function run(/** @type {import("../src/studio.js").Studio} */ s, ask = async () => true, steps = stubs().steps, film = "hello") {
  /** @type {string[]} */
  const lines = [];
  /** @type {string[]} */
  const headings = [];
  const out = { log: (/** @type {unknown[]} */ ...l) => void lines.push(l.join(" ")), heading: (/** @type {string} */ t) => void headings.push(t), json: false };
  return { lines, headings, result: await tour(s, film, { ask, open: true }, out, steps) };
}

test("the tour makes films/hello, then checks it, shows its contact sheet and renders it, explaining each step", async () => {
  const s = studio();
  const { steps, calls } = stubs();
  /** @type {string[]} */
  const asked = [];
  const { result, lines, headings } = await run(s, async (step, stop) => (asked.push(`${step}: ${stop.command}`), true), steps);
  assert.equal(result.ok, true);
  assert.match(readFileSync(join(s.dir, "films/hello/index.html"), "utf8"), /Acme, in one \*line\.\*/);
  assert.deepEqual(asked, [
    "new: filmkit new hello --template statement",
    "check: filmkit check hello",
    "contact: filmkit contact hello 16x9",
    "render: filmkit render hello",
  ]);
  assert.deepEqual(headings, ["A film", "Check", "Contact sheet", "Render"]);
  assert.ok(lines.some((l) => l.includes("films/hello/index.html")), "each step is explained");
  assert.deepEqual(calls.contact.map((c) => c.args), [["hello", "16x9"]]);
  assert.deepEqual(calls.render.map((c) => [c.args, c.options.studio]), [[["hello"], s.dir]]);
  assert.deepEqual(calls.open, ["/sheet.png"]);
  assert.deepEqual(Object.keys(result).filter((k) => result[k] === null), []);
});

test("a no ends the tour at that step, with what ran so far", async () => {
  const s = studio();
  const { steps, calls } = stubs();
  const { result } = await run(s, async (step) => step !== "render", steps);
  assert.equal(result.ok, true);
  assert.equal(result.stopped, "render");
  assert.equal(result.render, null);
  assert.equal(calls.render.length, 0);
  assert.equal(calls.check.length, 1);
});

test("a no to the first step makes no film, and the closing lines only say how to come back", async () => {
  const s = studio();
  const { steps, calls } = stubs();
  const { result, lines } = await run(s, async () => false, steps);
  assert.equal(result.ok, true);
  assert.equal(result.stopped, "new");
  assert.ok(!existsSync(join(s.dir, "films/hello")));
  assert.equal(calls.check.length, 0);
  assert.ok(lines.some((l) => l.includes("skipped: run filmkit new hello --template statement")));
  assert.deepEqual(next(s, "hello"), ["Run filmkit tour again when you're ready."]);
});

test("the tour uses a film that's already there without asking to make it, or naming a template it didn't use", async () => {
  const s = studio();
  newFilm(s, "launch", "explainer");
  /** @type {string[]} */
  const asked = [];
  const { result, lines } = await run(s, async (step) => (asked.push(step), true), undefined, "launch");
  assert.equal(result.new, null);
  assert.ok(!asked.includes("new"));
  assert.ok(lines.some((l) => l.includes("already there")));
  assert.ok(!lines.some((l) => l.includes("statement")));
});

test("the closing hint points at the promise scene only in a film that has one", () => {
  const s = studio();
  newFilm(s, "hello", "statement");
  newFilm(s, "launch", "explainer");
  assert.match(next(s, "hello")[0], /promise scene's "text" in films\/hello\/index\.html/);
  assert.match(next(s, "launch")[0], /data-variable-values in films\/launch\/index\.html/);
  assert.match(next(s, "launch").at(-1) ?? "", /launch film for Acme/);
});

test("a film name that isn't plain fails before the tour looks for it, even when the path is there", async () => {
  const s = studio();
  mkdirSync(join(s.dir, "x"));
  const { steps, calls } = stubs();
  await assert.rejects(run(s, undefined, steps, "../x"), { code: "bad_film_name" });
  assert.equal(calls.check.length, 0);
});

test("a failed check stops the tour with exit 1, before the contact sheet", async () => {
  const s = studio();
  const { steps, calls } = stubs({ check: async () => ({ ok: false }) });
  const { result } = await run(s, undefined, steps);
  assert.equal(result.ok, false);
  assert.equal(result.exit, 1);
  assert.equal(calls.contact.length, 0);
  assert.equal(calls.open.length, 0);
});

test("a failed render keeps its exit code", async () => {
  const { steps } = stubs({ render: async () => ({ ok: false, exit: 4 }) });
  const { result } = await run(studio(), undefined, steps);
  assert.equal(result.exit, 4);
});

test("unattended, the tour runs every step, and --no-render stops before the render", async () => {
  /** @param {Record<string, any>} options */
  const answers = (options) => Promise.all(/** @type {const} */ (["new", "check", "contact", "render"]).map((step) => fromFlags(options)(step, { title: "", explain: [], command: "" })));
  assert.deepEqual(await answers({}), [true, true, true, true]);
  assert.deepEqual(await answers({ "no-render": true }), [true, true, true, false]);
});

test("filmkit tour on a pipe doesn't ask: a bad film name fails at once, with exit 2", () => {
  const s = studio();
  const run = spawnSync(process.execPath, [CLI, "tour", "Bad Name", "--studio", s.dir, "--json"], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  assert.equal(run.status, 2, run.stderr);
  assert.equal(JSON.parse(run.stdout).code, "bad_film_name");
  assert.ok(!existsSync(join(s.dir, "films/Bad Name")));
});
