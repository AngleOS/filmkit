// A theme is a folder with a theme.json: the brand as data. filmkit.json names a built-in theme (themes/<name>), a
// theme folder in the studio, or an object of single values over one of those ("extends"). A theme.json can extend
// another the same way, so a brand's folder holds only what differs. The build copies each folder of the chain into
// kit/theme/, base first, and writes kit/theme/theme.css compiled from the merged values: the custom properties the
// kit and the theme's brand.js read (D-007).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./schema.js";
import { FilmkitError } from "./studio.js";

// Not from studio.js's PACKAGE: studio.js imports this module, so its constants aren't set yet when this one loads.
const THEMES = fileURLToPath(new URL("../themes", import.meta.url));
/** A built-in theme is named plainly; anything with a slash or a dot is a folder. */
const BUILT_IN = /^[a-z0-9-]+$/;

/**
 * @typedef {{ family: string, weight?: number, tracking?: string, leading?: number }} Font
 * @typedef {{ grounds: Record<string, string>, accent: string, accentOn?: { paper?: string },
 *   text: { ink: string, muted: string, onPaper: string, mutedOnPaper: string, wordmark?: string },
 *   fonts: { dir?: string, display: Font, ui: Font, mono: Font, faces?: { family: string, weight: number, style?: string, file: string }[] },
 *   label?: string } & Record<string, unknown>} ThemeValues
 * @typedef {{ name: string, dirs: string[], values: ThemeValues }} Theme
 *   `dirs` are the theme's folders, base first; `values` its theme.json merged down the chain, with every layer's font
 *   faces and each face's file from the folder
 */

/**
 * The studio's theme, as filmkit.json names it.
 * @param {string} studio the studio's directory
 * @param {string | Record<string, unknown>} [ref]
 * @returns {Theme}
 */
export function loadTheme(studio, ref = "default") {
  const own = typeof ref === "string" ? undefined : ref;
  const name = typeof ref === "string" ? ref : String(ref.extends ?? "default");
  const layers = [...chain(name, studio, studio, []), ...(own ? [{ dir: "", values: own }] : [])];
  const values = /** @type {ThemeValues} */ (layers.reduce((merged, layer) => merge(merged, layer.values), {}));
  delete values.extends;
  // Each layer's faces add to its base's, so a brand folder can add its display face and keep the base's UI and mono.
  // Their files are found through their own layer's fonts.dir.
  const faces = layers.flatMap(({ values: v }) => /** @type {ThemeValues} */ (v).fonts?.faces?.map((f) => ({ ...f, file: `${/** @type {ThemeValues} */ (v).fonts.dir ?? "fonts"}/${f.file}` })) ?? []);
  if (values.fonts) values.fonts = { ...values.fonts, faces };
  const dirs = layers.map((l) => l.dir).filter(Boolean);
  const problems = [...validate(values, "complete"), ...missingFaces(values, dirs)];
  if (problems.length) throw new FilmkitError(`theme "${name}": ${problems.join("; ")}`);
  return { name, dirs, values };
}

/**
 * The theme's folders and values from `ref` up to its base.
 * @param {string} ref a built-in name or a folder, from `from`
 * @param {string} from
 * @param {string} studio
 * @param {string[]} seen
 * @returns {{ dir: string, values: Record<string, unknown> }[]}
 */
function chain(ref, from, studio, seen) {
  const builtIn = BUILT_IN.test(ref);
  const dir = builtIn ? join(THEMES, ref) : resolve(from, ref);
  const file = join(dir, "theme.json");
  const shown = builtIn ? `theme "${ref}"` : relative(studio, file);
  if (!existsSync(file)) {
    throw new FilmkitError(builtIn ? `no theme "${ref}" (${readdirSync(THEMES).join(", ")}, or a folder with a theme.json)` : `no ${shown}`);
  }
  if (seen.includes(dir)) throw new FilmkitError(`${shown} extends itself`);
  let values;
  try {
    values = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new FilmkitError(`${shown}: ${/** @type {Error} */ (e).message}`);
  }
  const problems = validate(values, "theme").concat(values?.constructor === Object ? [] : ["it should be an object"]);
  if (problems.length) throw new FilmkitError(`${shown}: ${problems.join("; ")}`);
  const base = typeof values.extends === "string" ? chain(values.extends, dir, studio, [...seen, dir]) : [];
  return [...base, { dir, values }];
}

/**
 * Objects merge key by key; anything else, a list included, replaces what's under it.
 * @param {Record<string, any>} under
 * @param {Record<string, any>} over
 * @returns {Record<string, any>}
 */
function merge(under, over) {
  const out = { ...under };
  for (const [k, v] of Object.entries(over)) out[k] = v?.constructor === Object && under[k]?.constructor === Object ? merge(under[k], v) : v;
  return out;
}

/** @param {ThemeValues} values @param {string[]} dirs */
function missingFaces({ fonts }, dirs) {
  return (fonts?.faces ?? [])
    .filter((face) => !dirs.some((d) => existsSync(join(d, face.file))))
    .map((face) => `fonts.faces: no ${face.file} in the theme's folders`);
}

/**
 * theme.css: @font-face for each face, then the custom properties the kit reads, and their values on paper.
 * @param {ThemeValues} theme a loaded theme's values
 */
export function themeCss({ label, grounds, accent, accentOn, text, fonts }) {
  const faces = (fonts.faces ?? []).map(
    (f) => `@font-face { font-family: "${f.family}"; src: url("${f.file}"); font-weight: ${f.weight};${f.style ? ` font-style: ${f.style};` : ""} }\n`,
  );
  const paperAccent = accentOn?.paper ?? accent;
  const root = {
    ...grounds,
    accent,
    foreground: text.ink,
    "muted-foreground": text.muted,
    "font-display": `"${fonts.display.family}", sans-serif`,
    "font-ui": `"${fonts.ui.family}", sans-serif`,
    "font-mono": `"${fonts.mono.family}", monospace`,
    "title-weight": fonts.display.weight ?? 600,
    "title-tracking": fonts.display.tracking ?? "-0.035em",
    "title-leading": fonts.display.leading ?? 1.02,
    "brand-mark": accent,
    "brand-word": text.wordmark ?? text.ink,
    "brand-line": accent,
  };
  const paper = {
    foreground: text.onPaper,
    "muted-foreground": text.mutedOnPaper,
    accent: paperAccent,
    "brand-mark": paperAccent,
    "brand-word": text.onPaper,
    "brand-line": paperAccent,
  };
  /** @param {Record<string, string | number>} props */
  const block = (props) => Object.entries(props).map(([k, v]) => `  --${k}: ${v};\n`).join("");
  return `/* The ${label ?? "studio's"} theme, compiled by filmkit from theme.json: change that, not this file. */\n${faces.join("")}\n:root {\n${block(root)}}\n\n.on-paper {\n${block(paper)}}\n`;
}
