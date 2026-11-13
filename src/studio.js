// The studio is the user's own repo, and the CLI works on the one in the current directory: filmkit.json, films/<name>/
// (index.html is the master every format is laid out from), build/ (assembled formats) and renders/ (the output).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sceneStarts } from "./build/captions.js";
import { startTags } from "./build/html.js";
import { fail } from "./errors.js";
import { readJson } from "./json.js";
import { validate } from "./schema.js";
import { loadTheme } from "./theme.js";

export { FilmkitError, RequirementError } from "./errors.js";

/** The package's own directory, where kit/ and themes/ live. */
export const PACKAGE = fileURLToPath(new URL("..", import.meta.url));

/** Each format's canvas: width × height in px. */
export const SIZES = /** @type {const} */ ({ "16x9": [1920, 1080], "9x16": [1080, 1920], "1x1": [1080, 1080], "4x5": [1080, 1350] });
export const FORMATS = Object.keys(SIZES);

/**
 * @typedef {{ dir: string, name: string, formats: string[], theme: import("./theme.js").Theme, renders: string }} Studio
 *   `name` is the brand or product the films are for, which templates fill in; `renders` is the folder renders go to
 * @typedef {{ name: string, dir: string, html: string, root: Record<string, string> }} Film
 */

/**
 * The studio: `dir` when given (--studio), else the nearest directory with a filmkit.json, walking up from the cwd.
 * @param {string} [dir]
 * @returns {Studio}
 */
export function openStudio(dir) {
  const root = studioDir(dir);
  const file = join(root, "filmkit.json");
  const config = readJson(file, "config_json");
  const problems = validate(config);
  if (problems.length) throw fail("config_key", { problems, schema: join(PACKAGE, "schema", "filmkit.schema.json") });
  const theme = loadTheme(root, config.theme);
  return { dir: root, name: config.name ?? basename(root), formats: config.formats ?? FORMATS, theme, renders: resolve(root, config.renders ?? "renders") };
}

/**
 * The studio's directory, without opening it: `dir` when given, else the nearest with a filmkit.json.
 * @param {string} [dir]
 */
export function studioDir(dir) {
  const root = dir ? resolve(dir) : findStudio(process.cwd());
  if (!root || !existsSync(join(root, "filmkit.json"))) throw fail("no_studio", { dir: dir ? root : process.cwd(), walked: !dir });
  return root;
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
  if (!name) throw fail("film_unnamed", { films: filmNames(studio) });
  const dir = join(studio.dir, "films", name);
  if (!existsSync(join(dir, "index.html"))) throw fail("no_film", { film: name, films: filmNames(studio) });
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const tags = startTags(html);
  const root = tags.find((t) => t.attrs["data-composition-id"] === "main");
  if (!root) throw fail("no_root", { film: name });
  try {
    sceneStarts(html);
  } catch (e) {
    throw fail("bad_start", { film: name, problem: /** @type {Error} */ (e).message });
  }
  const scenes = readdirSync(join(PACKAGE, "kit", "scenes")).map((f) => f.replace(/\.html$/, ""));
  for (const tag of tags) {
    const scene = tag.attrs["data-composition-src"]?.match(/^kit\/scenes\/(.+)\.html$/)?.[1];
    if (scene && !scenes.includes(scene)) throw fail("unknown_scene", { film: name, scene, scenes });
  }
  return { name, dir, html, root: root.attrs };
}

/** The studio's films: each folder of films/ with an index.html. @param {Studio} studio */
export function filmNames(studio) {
  const films = join(studio.dir, "films");
  return existsSync(films) ? readdirSync(films).filter((f) => existsSync(join(films, f, "index.html"))).sort() : [];
}

/**
 * The formats to work on: the ones named, else the film's own (its root's data-formats, as a vertical hook's
 * "9x16"), else the studio's.
 * @param {Studio} studio
 * @param {Film} film
 * @param {string[]} named
 */
export function resolveFormats(studio, film, named = []) {
  if (named.length) return checkFormats(named);
  const own = film.root["data-formats"]?.split(/[\s,]+/).filter(Boolean);
  if (own?.length) return checkFormats(own, `films/${film.name}/index.html data-formats`);
  return studio.formats;
}

/**
 * @param {string[]} formats
 * @param {string} [where] the setting they came from, when it isn't the command line
 * @returns {string[]}
 */
function checkFormats(formats, where) {
  const unknown = formats.filter((f) => !FORMATS.includes(f));
  if (unknown.length) throw fail("unknown_format", { formats: unknown, where, known: FORMATS });
  return formats;
}
