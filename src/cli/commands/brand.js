import { relative } from "node:path";
import { googleFont, openMatch } from "../../brand/fonts.js";
import { readSite } from "../../brand/site.js";
import { checkAnswers, writeBrand } from "../../brand/write.js";
import { studioDir } from "../../studio.js";

export const usage = "brand [--from-url site] [--name n] [--logo file] [--accent hex] [--ground dark|light] [--font family]";
export const summary = "the studio's brand, read from its website or given: brand/logo.svg, and a palette from the accent that passes WCAG AA and a font from Google Fonts, as brand/theme";
const text = { type: /** @type {const} */ ("string") };
export const options = { "from-url": text, name: text, logo: text, accent: text, ground: text, font: text };

/** @param {import("../index.js").Context} ctx */
export async function run(ctx) {
  const result = await brandStudio(ctx);
  ctx.log("Next: npx filmkit contact smoke, to see the brand in every scene");
  return result;
}

/**
 * The brand written, without the next step: inside setup, the first film comes next.
 * @param {import("../index.js").Context} ctx
 */
export async function brandStudio({ options, log }) {
  const root = studioDir(/** @type {string | undefined} */ (options.studio));
  /** @param {string} key */
  const given = (key) => /** @type {string | undefined} */ (options[key]);
  const url = given("from-url");
  // A mistyped option should fail at once, not after the site's or the font's download.
  checkAnswers(root, { name: given("name"), logo: given("logo"), accent: given("accent"), ground: given("ground"), font: given("font"), url });
  const site = url ? await readSite(url) : undefined;
  if (site) log(siteSays(site));
  const answers = {
    name: given("name"),
    logo: given("logo") ?? site?.logo,
    accent: given("accent") ?? site?.accent,
    ground: given("ground") ?? site?.ground,
  };
  const font = await fontFor(given("font"), site, log);
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
  if (result.files.length) log(`  wrote ${result.files.map((f) => relative(root, f)).join(", ")}`);
  return {
    ok: true,
    ...result,
    ...(font && { font: { family: font.family, weights: font.faces.map((f) => f.weight), licence: font.licence?.file ?? null } }),
    ...(site && { site: { url: site.url, logo: site.logo?.from ?? null, accent: site.accent ?? null, ground: site.ground ?? null, font: site.font ?? null } }),
  };
}

/** What the site gave, and what it didn't. @param {import("../../brand/site.js").Site} site */
function siteSays({ url, logo, accent, ground, font, missing }) {
  const found = [logo && `the logo, from ${logo.from}`, accent && `the accent ${accent}`, ground && `a ${ground} ground`, font && `the font ${font}`];
  const lines = [`· from ${url}: ${found.filter(Boolean).join(", ") || "nothing it could use"}`];
  if (missing.length) lines.push(`  not found: ${missing.join(", ")}; give ${missing.map((m) => `--${m}`).join(", ")} to set them`);
  return lines.join("\n");
}

/**
 * The font: --font's, else the site's if Google Fonts has it, which only an open-licence font can be copied from.
 * @param {string | undefined} family
 * @param {import("../../brand/site.js").Site | undefined} site
 * @param {(line: string) => void} log
 */
async function fontFor(family, site, log) {
  if (family) return googleFont(family);
  if (!site?.font) return undefined;
  try {
    return await googleFont(site.font);
  } catch (e) {
    if (/** @type {import("../../errors.js").FilmkitError} */ (e).code !== "font_unknown") throw e;
    const like = openMatch(site.font);
    const suggest = like ? `${like} is an open font like it: --font '${like}'` : "name an open font like it with --font";
    log(`· ${site.font} isn't on Google Fonts, so filmkit can't copy it: the theme keeps its type; ${suggest}`);
    return undefined;
  }
}
