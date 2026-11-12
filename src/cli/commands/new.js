import { relative } from "node:path";
import { newFilm, templates } from "../../create.js";
import { openStudio } from "../../studio.js";

export const usage = "new <film> [--template t]";
export const summary = `a film from a template (${templates().join(", ")}; statement when not named), with its brief and placeholder claims`;
export const options = { template: { type: /** @type {const} */ ("string") } };

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const result = newFilm(studio, args[0], /** @type {string | undefined} */ (options.template) ?? "statement");
  log(`✓ films/${result.film} from the ${result.template} template`);
  for (const file of result.files) log(`  ${relative(studio.dir, file)}`);
  log(`Next: write films/${result.film}/brief.md and replace the ⚑ placeholder rows in CLAIMS.md, then npx filmkit check ${result.film}`);
  return { ok: true, ...result };
}
