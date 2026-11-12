import { relative } from "node:path";
import { initStudio } from "../../create.js";

export const usage = "init [dir] [--name brand]";
export const summary = "make a studio: filmkit.json, brand/, a smoke film, CLAIMS.md, POSTING.md, AGENTS.md and the filmkit skill";
export const options = { name: { type: /** @type {const} */ ("string") } };

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, log }) {
  const dir = args[0] ?? /** @type {string | undefined} */ (options.studio) ?? ".";
  const result = initStudio(dir, /** @type {string | undefined} */ (options.name));
  /** @param {string} path */
  const short = (path) => relative(result.studio, path);
  log(`✓ a studio for ${result.name} in ${result.studio}`);
  log(`  wrote ${result.files.map(short).join(", ")}`);
  if (result.kept.length) log(`  kept ${result.kept.map(short).join(", ")}: already there`);
  log(`Next: ${dir === "." ? "" : `cd ${dir} && `}npx filmkit check smoke, then npx filmkit new <film> --template statement`);
  return { ok: true, ...result };
}
