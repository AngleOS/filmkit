import { relative } from "node:path";
import { writeBrand } from "../../brand/write.js";
import { studioDir } from "../../studio.js";

export const usage = "brand [--name n] [--logo file] [--accent hex] [--ground dark|light]";
export const summary = "the studio's brand: brand/logo.svg, and a palette from the accent that passes WCAG AA, as brand/theme";
const text = { type: /** @type {const} */ ("string") };
export const options = { name: text, logo: text, accent: text, ground: text };

/** @param {import("../index.js").Context} ctx */
export async function run({ options, log }) {
  const root = studioDir(/** @type {string | undefined} */ (options.studio));
  /** @param {string} key */
  const given = (key) => /** @type {string | undefined} */ (options[key]);
  const result = writeBrand(root, { name: given("name"), logo: given("logo"), accent: given("accent"), ground: given("ground") });
  log(`✓ ${result.name}'s brand in ${root}`);
  const { palette } = result;
  if (palette) log(`  the accent ${palette.accent} on a ${palette.ground} ground`);
  for (const a of palette?.adjusted ?? []) {
    log(`  ${a.key} is ${a.used}: ${a.brand} is ${a.ratio}:1 on ${a.key === "accent" ? "the ground" : "paper"}, under the 4.5:1 text needs`);
  }
  log(`  wrote ${result.files.map((f) => relative(root, f)).join(", ")}`);
  log("Next: npx filmkit contact smoke, to see the brand in every scene");
  return { ok: true, ...result };
}
