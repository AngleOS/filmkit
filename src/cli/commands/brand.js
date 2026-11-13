import { relative } from "node:path";
import { googleFont } from "../../brand/fonts.js";
import { checkAnswers, writeBrand } from "../../brand/write.js";
import { studioDir } from "../../studio.js";

export const usage = "brand [--name n] [--logo file] [--accent hex] [--ground dark|light] [--font family]";
export const summary = "the studio's brand: brand/logo.svg, and a palette from the accent that passes WCAG AA and a font from Google Fonts, as brand/theme";
const text = { type: /** @type {const} */ ("string") };
export const options = { name: text, logo: text, accent: text, ground: text, font: text };

/** @param {import("../index.js").Context} ctx */
export async function run({ options, log }) {
  const root = studioDir(/** @type {string | undefined} */ (options.studio));
  /** @param {string} key */
  const given = (key) => /** @type {string | undefined} */ (options[key]);
  // setup passes on its --brand-url; reading a site is still to come, so say the URL went unused rather than drop it.
  if (given("from-url")) log(`· ${given("from-url")} isn't read yet: this version of filmkit brand takes the name, logo, accent, ground and font`);
  const answers = { name: given("name"), logo: given("logo"), accent: given("accent"), ground: given("ground") };
  // A mistyped option should fail at once, not after the font's download.
  checkAnswers(root, { ...answers, font: given("font") });
  const font = given("font") ? await googleFont(/** @type {string} */ (given("font"))) : undefined;
  const result = writeBrand(root, { ...answers, font });
  log(`✓ ${result.name}'s brand in ${root}`);
  const { palette } = result;
  if (palette) log(`  the accent ${palette.accent} on a ${palette.ground} ground`);
  for (const a of palette?.adjusted ?? []) {
    log(`  ${a.key} is ${a.used}: ${a.brand} is ${a.ratio}:1 on ${a.key === "accent" ? "the ground" : "paper"}, under the 4.5:1 text needs`);
  }
  if (font) log(`  ${font.family} for titles and text, in ${font.faces.map((f) => f.weight).join(", ")}`);
  // Google Fonts are all open, but where google/fonts keeps a family's licence can't always be guessed from its name.
  if (font && !font.licence) log(`· no licence for ${font.family} found in github.com/google/fonts: add it to brand/theme/fonts`);
  log(`  wrote ${result.files.map((f) => relative(root, f)).join(", ")}`);
  log("Next: npx filmkit contact smoke, to see the brand in every scene");
  return { ok: true, ...result, ...(font && { font: { family: font.family, weights: font.faces.map((f) => f.weight), licence: font.licence?.file ?? null } }) };
}
