// The studio is the user's own repo, and the CLI works on the one in the current directory: filmkit.json, films/<name>/
// (index.html is the master every format is laid out from), build/ (assembled formats) and renders/ (the output).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startTags } from "./build/html.js";
import { fail } from "./errors.js";
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
  const root = dir ? resolve(dir) : findStudio(process.cwd());
  const file = join(root, "filmkit.json");
  if (!root || !existsSync(file)) throw fail("no_studio", { dir: dir ? root : process.cwd(), walked: !dir });
  const config = readConfig(file);
  const problems = validate(config);
  if (problems.length) throw fail("config_key", { problems, schema: join(PACKAGE, "schema", "filmkit.schema.json") });
  const theme = loadTheme(root, config.theme);
  return { dir: root, name: config.name ?? basename(root), formats: config.formats ?? FORMATS, theme, renders: resolve(root, config.renders ?? "renders") };
}

/**
 * filmkit.json's value, for the schema to check; a syntax error points at its line and column.
 * @param {string} file
 * @returns {any}
 */
function readConfig(file) {
  const text = readFileSync(file, "utf8");
  try {
    return JSON.parse(text);
  } catch (e) {
    const { message } = /** @type {Error} */ (e);
    const position = +(message.match(/at position (\d+)/)?.[1] ?? text.length);
    const before = text.slice(0, position).split("\n");
    const error = message.replace(/ in JSON at position.*/, "").replace(/\.$/, "");
    throw fail("config_json", { error, at: `${file}:${before.length}:${before[before.length - 1].length + 1}` });
  }
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
  const names = () => (existsSync(films) ? readdirSync(films).filter((f) => existsSync(join(films, f, "index.html"))) : []);
  if (!name) throw fail("film_unnamed", { films: names() });
  const dir = join(films, name);
  if (!existsSync(join(dir, "index.html"))) throw fail("no_film", { film: name, films: names() });
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const tags = startTags(html);
  const root = tags.find((t) => t.attrs["data-composition-id"] === "main");
  if (!root) throw fail("no_root", { film: name });
  const scenes = readdirSync(join(PACKAGE, "kit", "scenes")).map((f) => f.replace(/\.html$/, ""));
  for (const tag of tags) {
    const scene = tag.attrs["data-composition-src"]?.match(/^kit\/scenes\/(.+)\.html$/)?.[1];
    if (scene && !scenes.includes(scene)) throw fail("unknown_scene", { film: name, scene, scenes });
  }
  return { name, dir, html, root: root.attrs };
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
