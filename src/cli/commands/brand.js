import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { googleFont, openMatch } from "../../brand/fonts.js";
import { proposeGround } from "../../brand/palette.js";
import { readSite } from "../../brand/site.js";
import { brandStill } from "../../brand/still.js";
import { HEX, checkAnswers, writeBrand } from "../../brand/write.js";
import { STEPS } from "../../setup.js";
import { studioDir } from "../../studio.js";
import { answer as answered, asking, p, start } from "../walkthrough.js";

export const usage = "brand [--from-url site] [--name n] [--logo file] [--accent hex] [--ground dark|light] [--font family] [--yes]";
export const summary = "the studio's brand, read from its website or given: brand/logo.svg, and a palette from the accent that passes WCAG AA and a font from Google Fonts, as brand/theme; in a terminal it asks what no flag gives and shows a still to say yes to, unless --yes";
const text = { type: /** @type {const} */ ("string") };
export const options = { "from-url": text, name: text, logo: text, accent: text, ground: text, font: text, yes: { type: /** @type {const} */ ("boolean"), short: "y" } };

const NEXT = "Next: npx filmkit contact smoke, to see the brand in every scene";

/**
 * In a terminal, each question a flag doesn't answer; an empty answer keeps what the brand has.
 * @typedef {{
 *   site: () => Promise<string | undefined>,
 *   logo: () => Promise<string | undefined>,
 *   accent: (now?: string) => Promise<string | undefined>,
 *   ground: (proposed: string) => Promise<string>,
 *   font: (like?: string) => Promise<string | undefined>,
 *   looksRight: (root: string, log: (line: string) => void) => Promise<boolean>,
 * }} Ask
 */

/** @param {import("../index.js").Context} ctx */
export async function run(ctx) {
  if (!asking(ctx)) {
    const result = await brandStudio(ctx);
    ctx.log(NEXT);
    return result;
  }
  const { log } = await start();
  const result = await brandStudio({ ...ctx, log });
  p.outro(NEXT);
  return result;
}

/**
 * The brand written, without the next step: inside setup, the first film comes next. A person at a terminal is asked
 * for the brand when no flag gives it, and says yes to a still of it, or changes it.
 * @param {import("../index.js").Context} ctx
 * @param {Ask} [ask]
 */
export async function brandStudio(ctx, ask = asking(ctx) ? inTerminal() : undefined) {
  const { options, log } = ctx;
  const root = studioDir(/** @type {string | undefined} */ (options.studio));
  /** @param {string} key */
  const given = (key) => /** @type {string | undefined} */ (options[key]);
  const flags = { name: given("name"), logo: given("logo"), accent: given("accent"), ground: given("ground"), font: given("font"), url: given("from-url") };
  // The name alone, which setup always passes, leaves the rest to ask.
  const questions = ask && !flags.logo && !flags.accent && !flags.ground && !flags.font && !flags.url;
  if (questions) flags.url = await ask.site();
  // A mistyped option should fail at once, not after the site's or the font's download.
  else checkAnswers(root, flags);
  const site = flags.url ? await readSite(flags.url) : undefined;
  if (site) log(siteSays(site));
  const known = { logo: flags.logo ?? site?.logo, accent: flags.accent ?? site?.accent, ground: flags.ground ?? site?.ground };
  let font = await fontFor(flags.font, site, log);
  const parts = ask && questions ? await askFor(ask, { ...known, font }, log, site?.font && openMatch(site.font)) : { ...known, font };
  font = parts.font;
  let result = write(root, { name: flags.name, ...parts }, log);
  while (ask && !(await ask.looksRight(root, log))) {
    const again = await askFor(ask, {}, log, undefined, result.palette);
    font = again.font ?? font;
    result = write(root, again, log);
  }
  return {
    ok: true,
    ...result,
    ...(font && { font: { family: font.family, weights: font.faces.map((f) => f.weight), licence: font.licence?.file ?? null } }),
    ...(site && { site: { url: site.url, logo: site.logo?.from ?? null, accent: site.accent ?? null, ground: site.ground ?? null, font: site.font ?? null } }),
  };
}

/**
 * The brand's parts `known` doesn't have, asked; `now`, the palette written, is what each question starts from.
 * @param {Ask} ask
 * @param {Omit<import("../../brand/write.js").Answers, "name">} known
 * @param {(line: string) => void} log
 * @param {string} [like] an open font like the site's
 * @param {{ accent: string, ground: string }} [now]
 */
async function askFor(ask, known, log, like, now) {
  const logo = known.logo ?? (await ask.logo());
  const accent = known.accent ?? (await ask.accent(now?.accent));
  const ground = known.ground ?? (await ask.ground(now?.ground ?? (accent ? proposeGround(accent) : "dark")));
  return { logo, accent, ground, font: known.font ?? (await askFont(ask, like, log)) };
}

/**
 * A Google Fonts family, asked until Google has it or the answer is empty.
 * @param {Ask} ask
 * @param {string | undefined} like
 * @param {(line: string) => void} log
 */
async function askFont(ask, like, log) {
  for (;;) {
    const family = await ask.font(like);
    if (!family) return undefined;
    try {
      return await googleFont(family);
    } catch (e) {
      if (/** @type {import("../../errors.js").FilmkitError} */ (e).code !== "font_unknown") throw e;
      log(`· Google Fonts has no ${family}: name a family as fonts.google.com spells it, or leave it empty`);
    }
  }
}

/**
 * The brand, written, and what was written, said.
 * @param {string} root
 * @param {import("../../brand/write.js").Answers} answers
 * @param {(line: string) => void} log
 */
function write(root, answers, log) {
  const result = writeBrand(root, answers);
  const { palette } = result;
  const { font } = answers;
  log(`✓ ${result.name}'s brand in ${root}`);
  if (palette) log(`  the accent ${palette.accent} on a ${palette.ground} ground`);
  for (const a of palette?.adjusted ?? []) {
    log(`  ${a.key} is ${a.used}: ${a.brand} is ${a.ratio}:1 on ${a.key === "accent" ? "the ground" : "paper"}, under the 4.5:1 text needs`);
  }
  if (font) log(`  ${font.family} for titles and text, in ${font.faces.map((f) => f.weight).join(", ")}`);
  // Google Fonts are all open, but where google/fonts keeps a family's licence can't always be guessed from its name.
  if (font && !font.licence) log(`· no licence for ${font.family} found in github.com/google/fonts: add it to brand/theme/fonts`);
  if (result.files.length) log(`  wrote ${result.files.map((f) => relative(root, f)).join(", ")}`);
  return result;
}

/** The questions, in the walkthrough's prompts. @returns {Ask} */
function inTerminal() {
  /** @param {string | symbol | undefined} value */
  const typed = (value) => answer(value)?.trim() || undefined;
  return {
    site: async () => typed(await p.text({ message: "Your brand's website, to read its logo, colours and font from (empty to answer a few questions instead)", placeholder: "acme.com" })),
    logo: async () => typed(await p.text({
      message: "Your logo, an SVG or a PNG (empty keeps the one there)",
      validate: (v) => (!v?.trim() || existsSync(resolve(v.trim())) ? undefined : "There's no file there."),
    })),
    accent: async (now) => typed(await p.text({
      message: "Your accent colour, as a hex (empty keeps the brand's)",
      placeholder: "#ff5a1f",
      initialValue: now,
      validate: (v) => (!v?.trim() || HEX.test(v.trim()) ? undefined : "A hex colour, such as #ff5a1f."),
    })),
    ground: async (proposed) => answer(await p.select({
      message: "On a dark ground or a light one?",
      options: [{ value: "dark", label: "dark" }, { value: "light", label: "light" }],
      initialValue: proposed,
    })),
    font: async (like) => typed(await p.text({
      message: like ? `A Google Fonts family for titles and text: ${like} is like the site's (empty keeps the type)` : "A Google Fonts family for titles and text (empty keeps the type)",
      initialValue: like,
    })),
    async looksRight(root, log) {
      log("· a still in the brand, a few seconds");
      const still = brandStill(root);
      if (!still) {
        log("· no still: HyperFrames couldn't take one. See the brand with filmkit contact smoke");
        return true;
      }
      log(`  ${relative(root, still)}, open`);
      STEPS.open(still);
      return answer(await p.confirm({ message: "Look right? (no to change it)" }));
    },
  };
}

/** @template T @param {T} value */
const answer = (value) => answered(value, "brand");

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
