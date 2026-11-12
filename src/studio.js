// The studio is the user's own repo, and the CLI works on the one in the current directory: filmkit.json, films/<name>/
// (index.html is the master every format is laid out from), build/ (assembled formats) and renders/ (the output).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rootTag } from "./build/html.js";

/** The package's own directory, where kit/ and themes/ live. */
export const PACKAGE = fileURLToPath(new URL("..", import.meta.url));

/** Each format's canvas: width × height in px. */
export const SIZES = /** @type {const} */ ({ "16x9": [1920, 1080], "9x16": [1080, 1920], "1x1": [1080, 1080], "4x5": [1080, 1350] });
export const FORMATS = Object.keys(SIZES);

/** A usage error: no studio, an unknown film or format, a bad option. The CLI exits 2. */
export class FilmkitError extends Error {}
/** A missing requirement (Node's npx, ffmpeg, Chrome). The CLI exits 3. */
export class RequirementError extends Error {}

/**
 * @typedef {{ dir: string, formats: string[], theme: string, themeDir: string }} Studio
 * @typedef {{ name: string, dir: string, html: string, root: Record<string, string> }} Film
 */

/**
 * The studio: `dir` when given (--studio), else the nearest directory with a filmkit.json, walking up from the cwd.
 * @param {string} [dir]
 * @returns {Studio}
 */
export function openStudio(dir) {
  const root = dir ? resolve(dir) : findStudio(process.cwd());
  const file = join(root, "filmkit.json");
  if (!root || !existsSync(file)) throw new FilmkitError(`no filmkit.json in ${dir ? root : `${process.cwd()} or above`}: run filmkit in a studio`);
  let config;
  try {
    config = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new FilmkitError(`filmkit.json: ${/** @type {Error} */ (e).message}`);
  }
  const theme = config.theme ?? "default";
  const themeDir = join(PACKAGE, "themes", theme);
  if (!existsSync(join(themeDir, "theme.css"))) {
    throw new FilmkitError(`filmkit.json: no theme "${theme}" (${readdirSync(join(PACKAGE, "themes")).join(", ")})`);
  }
  return { dir: root, formats: checkFormats(config.formats ?? FORMATS, "filmkit.json formats"), theme, themeDir };
}

/** @param {string} from @returns {string} the directory, or "" when there's none */
function findStudio(from) {
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(join(dir, "filmkit.json"))) return dir;
    if (dirname(dir) === dir) return "";
  }
}

/**
 * A film in the studio, with its master and the root composition's attributes.
 * @param {Studio} studio
 * @param {string | undefined} name
 * @returns {Film}
 */
export function openFilm(studio, name) {
  const films = join(studio.dir, "films");
  const names = () => (existsSync(films) ? readdirSync(films).join(", ") : "none") || "none";
  if (!name) throw new FilmkitError(`name a film (${names()})`);
  const dir = join(films, name);
  if (!existsSync(join(dir, "index.html"))) throw new FilmkitError(`no films/${name}/index.html (films: ${names()})`);
  const html = readFileSync(join(dir, "index.html"), "utf8");
  try {
    return { name, dir, html, root: rootTag(html).attrs };
  } catch (e) {
    throw new FilmkitError(`films/${name}/index.html: ${/** @type {Error} */ (e).message}`);
  }
}

/**
 * The formats to work on: the ones named, else the film's own (its root's data-formats, as a vertical hook's
 * "9x16"), else the studio's.
 * @param {Studio} studio
 * @param {Film} film
 * @param {string[]} named
 */
export function resolveFormats(studio, film, named = []) {
  if (named.length) return checkFormats(named, "format");
  const own = film.root["data-formats"]?.split(/[\s,]+/).filter(Boolean);
  if (own?.length) return checkFormats(own, `films/${film.name} data-formats`);
  return studio.formats;
}

/**
 * @param {unknown} formats
 * @param {string} where
 * @returns {string[]}
 */
function checkFormats(formats, where) {
  if (!Array.isArray(formats) || !formats.length) throw new FilmkitError(`${where}: list one or more of ${FORMATS.join(" ")}`);
  const unknown = formats.filter((f) => !FORMATS.includes(f));
  if (unknown.length) throw new FilmkitError(`${where}: unknown format ${unknown.join(", ")} (${FORMATS.join(" ")})`);
  return formats;
}
