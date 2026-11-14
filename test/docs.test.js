import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(ROOT, "src/cli/index.js");
const COMMANDS = join(ROOT, "src/cli/commands");
/** Options the CLI takes on every command (src/cli/index.js). */
const GLOBAL = {
  json: { type: /** @type {const} */ ("boolean") },
  studio: { type: /** @type {const} */ ("string") },
  help: { type: /** @type {const} */ ("boolean"), short: "h" },
  version: { type: /** @type {const} */ ("boolean"), short: "v" },
};
// These work offline, without Chrome, on nothing but a studio, so the test runs them as the docs write them. The
// quick start's are run by quickstart.test.js (CI's films job, with Chrome); the rest touch the network, a browser,
// the user's agent tools or wait for input, so the test holds them to the commands and options the CLI declares.
const RUNNABLE = new Set(["init", "new", "scenes", "explain", "prompt"]);

/** @param {string} dir @returns {string[]} */
function pages(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return pages(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

const DOCS = ["README.md", ...pages("docs")];

/** The shell a page shows: each line of its sh blocks, and each inline code span. @param {string} page */
function shell(page) {
  const text = readFileSync(join(ROOT, page), "utf8");
  const blocks = [...text.matchAll(/^```sh\n([\s\S]*?)^```/gm)].flatMap((match) => match[1].split("\n"));
  const prose = text.replace(/^(`{3,})[\s\S]*?^\1/gm, "");
  const spans = [...prose.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
  return [...blocks, ...spans];
}

/** Splits a command line into words, as sh would, up to a comment or the next command. @param {string} line */
function words(line) {
  const out = [];
  for (const [, single, double, bare] of line.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)) {
    if (bare && /^(#|\||&&|;)/.test(bare)) break;
    out.push(single ?? double ?? bare);
  }
  return out;
}

/** Every filmkit command in the docs: `filmkit`, `npx filmkit` or `npx -y <spec>`, then a command's name. */
const commands = DOCS.flatMap((page) =>
  shell(page).flatMap((code) =>
    [...code.matchAll(/(?:^|\s)(?:npx (?:-y )?(?:github:AngleOS\/)?)?filmkit ([a-z][a-z-]*)\b([^\n]*)/g)].map(([, name, rest]) => {
      const args = words(rest);
      return { page, text: ["filmkit", name, ...args].join(" "), name, args };
    }),
  ),
);

/** @type {Map<string, { usage: string, options?: import("node:util").ParseArgsConfig["options"] }>} */
const declared = new Map(
  await Promise.all(
    readdirSync(COMMANDS)
      .filter((file) => file.endsWith(".js"))
      .map(async (file) => /** @type {const} */ ([file.slice(0, -3), await import(join(COMMANDS, file))])),
  ),
);

/**
 * A command's arguments as the CLI parses them; throws on an option the command doesn't declare.
 * @param {{ name: string, args: string[] }} command
 */
function parse({ name, args }) {
  const end = args.includes("--") ? args.indexOf("--") : undefined;
  return parseArgs({ args: args.slice(0, end), options: { ...GLOBAL, ...declared.get(name)?.options }, allowPositionals: true });
}

test("the docs show filmkit's commands", () => {
  assert.ok(commands.length > 50, `found ${commands.length}`);
  for (const name of ["init", "new", "check", "contact", "render", "brand", "agents", "mcp"]) {
    assert.ok(commands.some((command) => command.name === name), name);
  }
});

test("every filmkit command in the docs is one the CLI has, with options it declares", () => {
  for (const command of commands) {
    const where = `${command.page}: \`${command.text}\``;
    assert.ok(declared.has(command.name), `${where}: no command ${command.name}`);
    assert.doesNotThrow(() => parse(command), where);
  }
});

test("the docs' offline commands run as written", { timeout: 120_000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-docs-"));
  const studio = join(dir, "studio");
  const init = spawnSync(process.execPath, [CLI, "init", studio, "--name", "Acme"], { encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  // One without a command's required arguments names its output (`filmkit new --json`), and isn't a run.
  const required = (/** @type {string} */ name) => declared.get(name)?.usage.match(/<[^>]+>/g)?.length ?? 0;
  const placeholder = (/** @type {string[]} */ args) => args.some((arg) => /[<>…]/.test(arg));
  const concrete = commands.filter(
    (command) => RUNNABLE.has(command.name) && !placeholder(command.args) && parse(command).positionals.length >= required(command.name),
  );
  const runs = [...new Map(concrete.map((command) => [[command.name, ...command.args].join(" "), command])).values()];
  assert.ok(runs.some(({ name }) => name === "new"), "the docs run `new`");
  for (const [i, { page, text, name, args }] of runs.entries()) {
    // `init` makes a studio, so it runs in an empty folder; the rest in a fresh copy of one.
    const cwd = join(dir, `run-${i}`);
    if (name === "init") mkdirSync(cwd);
    else cpSync(studio, cwd, { recursive: true });
    const { status, stdout, stderr } = spawnSync(process.execPath, [CLI, name, ...args], { cwd, encoding: "utf8" });
    assert.equal(status, 0, `${page}: \`${text}\`\n${stdout}\n${stderr}`);
  }
});
