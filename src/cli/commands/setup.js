import { registerAgents } from "../../agents/register.js";
import { studioDir, setup } from "../../setup.js";
import { fail } from "../../errors.js";
import { banner } from "../banner.js";
import { run as agents } from "./agents.js";
import { nodeSupported } from "./doctor.js";

export const usage = "setup [--yes] [--agents auto|none|ids] [--name brand] [--remove]";
export const summary = "from nothing to a first film: requirements, agent tools, a studio, the brand and films/hello; asks in a terminal unless --yes (--brand-url, --logo, --ground, --no-brand, --no-first-film)";
const string = { type: /** @type {const} */ ("string") };
const flag = { type: /** @type {const} */ ("boolean") };
export const options = {
  yes: { ...flag, short: "y" }, agents: string, name: string, "brand-url": string, logo: string, ground: string,
  "no-brand": flag, "no-first-film": flag, remove: flag,
};

/** @typedef {import("../index.js").Context["options"]} Options */

/** The prompt library, loaded only for the walkthrough: --help loads every command, and this one needs Node 20.12. */
/** @type {typeof import("@clack/prompts")} */
let p;

/** @param {import("../index.js").Context} ctx */
export async function run(ctx) {
  const { options, json, log } = ctx;
  if (options.remove) return agents({ ...ctx, args: [], options: { remove: true } });
  const ground = str(options.ground);
  if (ground && !GROUNDS.includes(ground)) throw fail("option_choice", { command: "setup", option: "--ground", value: ground, choices: GROUNDS });
  // The one command besides brand and tour that may ask (D-008), and only a person at a terminal. On a Node too old
  // for the prompts, it runs from the flags, and its requirements step says which Node to install.
  const asking = !options.yes && !json && Boolean(process.stdin.isTTY && process.stdout.isTTY) && nodeSupported();
  const brand = options["no-brand"] ? null : { url: str(options["brand-url"]), logo: str(options.logo), ground, yes: !asking };
  if (!asking) {
    const result = await setup({ ask: fromFlags(options), brand, open: false }, { log, heading: (t) => log(`▸ ${t}`), json });
    if (result.ok && result.studio) log(next(result.studio.name));
    return result;
  }
  p = await import("@clack/prompts");
  p.intro(banner(false) || "ANGLE FILMKIT");
  const result = await setup({ ask: inTerminal(options), brand, open: true }, {
    log: (...lines) => p.log.message(lines.join(" "), { spacing: 0 }),
    heading: (t) => p.log.step(t),
    json,
  });
  if (!result.ok) p.cancel("Setup stopped: fix the step above, then run filmkit setup again.");
  else p.outro(result.studio ? next(result.studio.name) : "Done.");
  return result;
}

const GROUNDS = ["dark", "light"];

/** @param {unknown} value */
const str = (value) => /** @type {string | undefined} */ (value);

/** @param {string} name */
const next = (name) => `Next: ask your agent, "Make a 30-second launch film for ${name}". It follows the filmkit skill.`;

/**
 * Each choice from its flag: every agent tool installed by default; the studio only when --studio or --name says
 * where, so an agent can set up its tools first and the studio once it has asked for the brand.
 * @param {Options} options
 * @returns {import("../../setup.js").Ask}
 */
export function fromFlags(options) {
  const name = str(options.name);
  const dir = str(options.studio) ?? (name && studioDir(name));
  return {
    agents: async () => agentIds(str(options.agents) ?? "auto"),
    studio: async () => (dir ? { dir, name } : null),
    firstFilm: async () => !options["no-first-film"],
  };
}

/** --agents: auto (every one installed, []), none (null) or a comma list of ids. @param {string} value */
const agentIds = (value) => (value === "none" ? null : value === "auto" ? [] : value.split(",").map((t) => t.trim()).filter(Boolean));

/**
 * Each choice its flag doesn't make, asked.
 * @param {Options} options
 * @returns {import("../../setup.js").Ask}
 */
function inTerminal(options) {
  const flags = fromFlags(options);
  return {
    async agents() {
      if (options.agents) return flags.agents();
      const found = registerAgents({ dryRun: true }).filter((t) => t.status !== "skipped");
      if (!found.length) {
        p.log.info("No agent tools found. Once you install one, run filmkit agents.");
        return null;
      }
      const ids = answer(await p.multiselect({
        message: "Connect Filmkit to these agent tools? (space toggles one)",
        options: found.map((t) => ({ value: t.id, label: t.name })),
        initialValues: found.map((t) => t.id),
        required: false,
      }));
      return ids.length ? ids : null;
    },
    async studio() {
      if (options.studio) return flags.studio();
      const name = str(options.name) ?? answer(await p.text({
        message: "Your brand or product's name",
        validate: (v) => (v?.trim() ? undefined : "Films need a name to put on screen."),
      })).trim();
      const dir = answer(await p.text({ message: "Where should the studio go?", initialValue: `./${studioDir(name)}` }));
      return { dir, name };
    },
    async firstFilm() {
      if (options["no-first-film"]) return false;
      return answer(await p.confirm({ message: "Make a first film, films/hello, and check it in every format? (a few minutes)" }));
    },
  };
}

/**
 * A prompt's answer; Ctrl+C or Esc ends setup where it is.
 * @template T @param {T} value @returns {Exclude<T, symbol>}
 */
function answer(value) {
  if (!p.isCancel(value)) return /** @type {Exclude<T, symbol>} */ (value);
  p.cancel("Setup stopped. Run filmkit setup again to carry on: it keeps what's done.");
  process.exit(130);
}
