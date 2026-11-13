// filmkit brand writes the studio's brand: its logo as brand/logo.svg, its palette as the theme folder brand/theme/
// (a theme.json over `default`, or `paper` on a light ground), and filmkit.json's name and theme. filmkit.json is
// edited in place, so its other keys, and their layout, stay as the studio wrote them (D-008, Design §8).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { applyEdits, modify } from "jsonc-parser";
import { fail } from "../errors.js";
import { readJson } from "../json.js";
import { loadTheme } from "../theme.js";
import { GROUNDS, palette, proposeGround } from "./palette.js";

/** filmkit.json's "theme" once the brand is written: the folder brand/theme. */
export const THEME = "brand/theme";
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
/** Angle's accent, which `default` has: the palette's accent when nothing names another. */
const PEAR = "#e3ef26";

/**
 * @typedef {{ name?: string, logo?: string, accent?: string, ground?: string }} Answers `logo` a file, from the cwd
 * @typedef {{ studio: string, name: string, files: string[], palette?: { accent: string, ground: string,
 *   adjusted: import("./palette.js").Adjusted[] } }} Written
 */

/**
 * The brand, into the studio at `root`. Only what's given changes: a palette needs the accent or the ground, and takes
 * the other from the brand already written, else from the studio's theme (its accent, the ground that accent reads on).
 * @param {string} root
 * @param {Answers} answers
 * @returns {Written}
 */
export function writeBrand(root, { name, logo, accent, ground }) {
  if (!name && !logo && !accent && !ground) throw fail("brand_nothing");
  if (accent && !HEX.test(accent)) throw fail("brand_option", { option: "--accent", value: accent, expected: 'a hex colour such as "#ff5a1f"' });
  if (ground && !GROUNDS.includes(ground)) throw fail("brand_option", { option: "--ground", value: ground, expected: GROUNDS.join(" or ") });
  const config = join(root, "filmkit.json");
  const current = readJson(config, "config_json");
  const label = name ?? current.name ?? basename(root);
  /** @type {string[]} */
  const files = [];
  if (logo) files.push(writeLogo(root, logo));
  let edits = readFileSync(config, "utf8");
  if (name) edits = edit(edits, ["name"], name);
  const file = join(root, THEME, "theme.json");
  const stored = existsSync(file) ? readJson(file, "theme_json", { file }) : undefined;
  /** @type {Written["palette"]} */
  let written;
  if (accent || ground || (name && stored)) {
    const brandAccent = (accent ?? [storedAccent(stored), themeAccent(root, current.theme)].find((a) => a && HEX.test(a)) ?? PEAR).toLowerCase();
    const on = ground ?? (stored ? (stored.extends === "paper" ? "light" : "dark") : proposeGround(brandAccent));
    const { values, adjusted } = palette(brandAccent, on);
    const theme = {
      extends: on === "light" ? "paper" : "default",
      label,
      description: `${label}'s brand, from filmkit brand: the accent ${brandAccent} on a ${on} ground.`,
      ...values,
    };
    mkdirSync(join(root, THEME), { recursive: true });
    writeFileSync(file, JSON.stringify(theme, null, 2) + "\n");
    files.push(file);
    edits = pointAtBrand(edits, current.theme);
    written = { accent: brandAccent, ground: on, adjusted };
  }
  writeFileSync(config, edits);
  files.push(config);
  return { studio: root, name: label, files, ...(written && { palette: written }) };
}

/**
 * The logo as brand/logo.svg: an SVG kept as it is, a PNG embedded in one at its own size.
 * @param {string} root
 * @param {string} from
 */
function writeLogo(root, from) {
  const file = resolve(from);
  if (!existsSync(file)) throw fail("logo_missing", { file });
  const to = join(root, "brand", "logo.svg");
  mkdirSync(join(root, "brand"), { recursive: true });
  const bytes = readFileSync(file);
  if (extname(file).toLowerCase() === ".svg" && /<svg[\s>]/.test(bytes.toString("utf8"))) {
    copyFileSync(file, to);
    return to;
  }
  // A PNG's width and height are the first two fields of its IHDR chunk, 16 bytes in.
  if (bytes.subarray(1, 4).toString("latin1") !== "PNG") throw fail("bad_logo", { file });
  const [w, h] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  const png = `data:image/png;base64,${bytes.toString("base64")}`;
  writeFileSync(to, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><image href="${png}" width="${w}" height="${h}"/></svg>\n`);
  return to;
}

/**
 * The brand's own accent, as the brand theme already written names it in its description: its `accent` may be the
 * nearest colour to it that reads, and a palette made from that would drift further from the brand's at each run.
 * @param {{ description?: string, accent?: string } | undefined} stored
 * @returns {string | undefined}
 */
function storedAccent(stored) {
  return stored?.description?.match(/the accent (#[0-9a-f]{3,6}) on a/)?.[1] ?? stored?.accent;
}

/**
 * The accent of the theme filmkit.json names now, built-in, folder or single values; none when it doesn't load, as a
 * theme that's broken can't say what the brand is.
 * @param {string} root
 * @param {string | Record<string, unknown> | undefined} theme
 * @returns {string | undefined}
 */
function themeAccent(root, theme) {
  try {
    return loadTheme(root, theme).values.accent;
  } catch {
    return undefined;
  }
}

/**
 * filmkit.json's "theme" pointed at brand/theme. Single values over another theme stay over the brand's, all but the
 * colours the brand now sets.
 * @param {string} text
 * @param {unknown} theme the current value
 */
function pointAtBrand(text, theme) {
  if (theme?.constructor !== Object) return edit(text, ["theme"], THEME);
  let out = edit(text, ["theme", "extends"], THEME);
  for (const key of ["grounds", "accent", "accentOn", "text"]) out = edit(out, ["theme", key], undefined);
  return out;
}

/** @param {string} text @param {string[]} path @param {unknown} value undefined to remove the key */
function edit(text, path, value) {
  return applyEdits(text, modify(text, path, value, { formattingOptions: { insertSpaces: true, tabSize: 2 } }));
}
