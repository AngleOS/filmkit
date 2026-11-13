// filmkit setup (Design §8, D-008): from nothing to a first film in the user's brand. Its steps are the CLI's own
// commands, run in turn: the requirements (fetching HyperFrames' Chrome once), the agent tools, the studio, the brand
// and a first film. Each choice comes from `ask`, which reads a flag or, in a terminal, asks; tests swap the steps
// that reach outside the studio.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { requirements } from "./cli/commands/doctor.js";
import { initStudio, newFilm } from "./create.js";
import { hyperframes } from "./hyperframes.js";
import { openStudio } from "./studio.js";

/**
 * @typedef {import("./cli/index.js").Context} Context
 * @typedef {import("./cli/commands/doctor.js").Check} Check
 * @typedef {{ ok: boolean } & Record<string, any>} StepResult
 * @typedef {{
 *   agents: () => Promise<string[] | null>,
 *   studio: () => Promise<{ dir: string, name?: string } | null>,
 *   firstFilm: () => Promise<boolean>,
 * }} Ask  each choice: the agent tools' ids ([] for every one installed, null for none); where the studio goes and
 *   the brand's name (null to stop before the studio); whether to make the first film
 * @typedef {{ url?: string, logo?: string, ground?: string, yes: boolean } | null} Brand  the brand flags, or null for --no-brand
 * @typedef {{
 *   requirements: () => Check[],
 *   fetchChrome: () => void,
 *   agents: (ctx: Context) => Promise<StepResult>,
 *   brand: (ctx: Context) => Promise<StepResult | null>,
 *   check: (ctx: Context) => Promise<StepResult>,
 *   contact: (ctx: Context) => Promise<StepResult>,
 *   open: (path: string) => void,
 * }} Steps
 * @typedef {{ log: (...lines: unknown[]) => void, heading: (title: string) => void, json: boolean }} Out
 */

const COMMANDS = new URL("cli/commands/", import.meta.url);
/** @param {string} name */
const command = async (name) => /** @type {import("./cli/index.js").Command} */ (await import(new URL(`${name}.js`, COMMANDS).href));

/** @type {Steps} */
export const STEPS = {
  requirements,
  fetchChrome: () => hyperframes(["browser", "ensure"], { cwd: process.cwd(), toStderr: true }),
  agents: async (ctx) => (await command("agents")).run(ctx),
  // `filmkit brand` is its own command (Design §8, step 4); until this version has it, the studio keeps the default theme.
  brand: async (ctx) => (existsSync(new URL("brand.js", COMMANDS)) ? (await command("brand")).run(ctx) : null),
  check: async (ctx) => (await command("check")).run(ctx),
  contact: async (ctx) => (await command("contact")).run(ctx),
  open: (path) => {
    const [cmd, ...args] = process.platform === "darwin" ? ["open"] : process.platform === "win32" ? ["cmd", "/c", "start", ""] : ["xdg-open"];
    spawn(cmd, [...args, path], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  },
};

/** The first film's name and template. */
export const FIRST_FILM = { name: "hello", template: "statement" };

/** A studio folder's default name: `./acme-films` for Acme. @param {string} name */
export const studioDir = (name) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand"}-films`;

/**
 * Runs setup's steps, stopping at the first that fails; the result has each step's own.
 * @param {{ ask: Ask, brand: Brand, open: boolean }} choices  `open`: show the contact sheet in the browser
 * @param {Out} out
 * @param {Steps} [steps]
 */
export async function setup({ ask, brand, open }, { log, heading, json }, steps = STEPS) {
  /** @param {string[]} args @param {Record<string, unknown>} options @returns {Context} */
  const ctx = (args, options) => ({ args, options: /** @type {Context["options"]} */ (options), json, log });

  heading("Requirements");
  let checks = steps.requirements();
  if (checks.some((c) => c.name === "Chrome" && !c.ok) && checks.every((c) => c.ok || c.name === "Chrome")) {
    log("Fetching Chrome for HyperFrames, once: about 2 minutes");
    steps.fetchChrome();
    checks = steps.requirements();
  }
  for (const c of checks) log(`${c.ok ? "✓" : "✗"} ${c.name.padEnd(11)} ${c.detail}${c.hint ? `\n    ${c.hint}` : ""}`);
  if (!checks.every((c) => c.ok)) return { ok: false, exit: 3, requirements: checks };
  /** @type {Record<string, any>} */
  const result = { ok: true, requirements: checks, agents: null, studio: null, brand: null, film: null };

  heading("Agent tools");
  const tools = await ask.agents();
  if (tools) result.agents = await steps.agents(ctx(tools, {}));
  else log("· skipped: register them later with filmkit agents");
  if (result.agents && !result.agents.ok) return { ...result, ok: false };

  heading("Studio");
  const where = await ask.studio();
  if (!where) {
    log("· skipped: make it with filmkit setup --studio <dir> --name <brand>");
    return result;
  }
  const dir = resolve(where.dir);
  if (existsSync(join(dir, "filmkit.json"))) {
    result.studio = { ok: true, studio: dir, name: openStudio(dir).name, files: [], kept: [join(dir, "filmkit.json")] };
    log(`✓ the studio in ${dir}, already there`);
  } else {
    result.studio = initStudio(dir, where.name);
    log(`✓ a studio for ${result.studio.name} in ${dir}`);
  }

  heading("Brand");
  if (brand) {
    result.brand = await steps.brand(ctx([], { studio: dir, name: where.name, "from-url": brand.url, logo: brand.logo, ground: brand.ground, yes: brand.yes }));
    if (!result.brand) log("· the default theme: filmkit brand isn't in this version yet");
    else if (!result.brand.ok) return { ...result, ok: false };
  } else log("· skipped: the studio keeps the default theme");

  heading("First film");
  if (!(await ask.firstFilm())) {
    log(`· skipped: make one with filmkit new ${FIRST_FILM.name} --template ${FIRST_FILM.template}`);
    return result;
  }
  result.film = await firstFilm(openStudio(dir), ctx, steps, open, log);
  return { ...result, ok: result.film.ok, ...(!result.film.ok && { exit: result.film.exit ?? 1 }) };
}

/**
 * films/hello from the statement template in the brand, checked in every format, and its 16:9 contact sheet.
 * @param {import("./studio.js").Studio} studio
 * @param {(args: string[], options: Record<string, unknown>) => Context} ctx
 * @param {Steps} steps
 * @param {boolean} open
 * @param {(...lines: unknown[]) => void} log
 */
async function firstFilm(studio, ctx, steps, open, log) {
  const { name, template } = FIRST_FILM;
  if (existsSync(join(studio.dir, "films", name))) log(`✓ films/${name}, already there`);
  else log(`✓ films/${newFilm(studio, name, template).film} from the ${template} template`);
  const check = await steps.check(ctx([name], { studio: studio.dir }));
  if (!check.ok) return { name, ok: false, check };
  const contact = await steps.contact(ctx([name, "16x9"], { studio: studio.dir }));
  const sheet = contact.sheets?.[0]?.path;
  if (sheet && open) steps.open(sheet);
  return { name, ok: contact.ok, check, contact, ...(!contact.ok && { exit: contact.exit }) };
}
