// The walkthroughs of setup, tour and brand (D-008): the only commands that ask, and only a person at a terminal. Every
// question has a flag, so with --yes, --json or on a pipe they run without one.
import { banner, pear } from "./banner.js";
import { nodeSupported } from "./commands/doctor.js";

/**
 * The prompt library, loaded only for a walkthrough: --help loads every command, and this needs Node 20.12.
 * @type {typeof import("@clack/prompts")}
 */
export let p;

/**
 * Whether to ask: a person at a terminal, on a Node the prompts run on. On an older one the command runs from its
 * flags, and setup's requirements step says which Node to install.
 * @param {import("./index.js").Context} ctx
 */
export const asking = ({ options, json }) => !options.yes && !json && Boolean(process.stdin.isTTY && process.stdout.isTTY) && nodeSupported();

/**
 * Opens the walkthrough under the Angle banner; its lines and headings (in Pear) go in the prompts' gutter.
 * @returns {Promise<{ log: (...lines: unknown[]) => void, heading: (title: string) => void }>}
 */
export async function start() {
  p = await import("@clack/prompts");
  p.intro(banner(false) || "ANGLE FILMKIT");
  return { log: (...lines) => p.log.message(lines.join(" "), { spacing: 0 }), heading: (title) => p.log.step(pear(title)) };
}

/**
 * A prompt's answer; Ctrl+C or Esc ends the walkthrough where it is.
 * @template T @param {T} value @param {string} command whose walkthrough it is
 * @returns {Exclude<T, symbol>}
 */
export function answer(value, command) {
  if (!p.isCancel(value)) return /** @type {Exclude<T, symbol>} */ (value);
  p.cancel(`Stopped. Run filmkit ${command} again to carry on: it keeps what's done.`);
  process.exit(130);
}
