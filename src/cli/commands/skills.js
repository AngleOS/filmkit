import { relative } from "node:path";
import { installSkills } from "../../create.js";
import { HYPERFRAMES, hyperframesSkills } from "../../hyperframes.js";
import { openStudio } from "../../studio.js";

export const usage = "skills";
export const summary = `install the filmkit skill and ${HYPERFRAMES}'s own skills into the studio's .claude/skills/`;

/** @param {import("../index.js").Context} ctx */
export async function run({ options, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const result = installSkills(studio, hyperframesSkills());
  for (const s of result.skills) log(`✓ ${relative(studio.dir, s.path)}  (${s.from})`);
  if (result.files.length) log(`  updated ${result.files.map((f) => relative(studio.dir, f)).join(", ")}`);
  log("Next: read .claude/skills/filmkit/SKILL.md, then .claude/skills/hyperframes/SKILL.md before writing a film's HTML");
  return { ok: true, ...result };
}
