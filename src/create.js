// init and new: a studio, and films in it, made from the package's templates/. templates/studio/ holds the studio's
// own files; every other folder with an index.html is a film template. {{name}} (the brand, from filmkit.json) and
// {{film}} are filled in as a template is copied, and its claims.md becomes the film's section of the studio's
// CLAIMS.md, each placeholder row flagged ⚑, so a film can't be posted with a template's words.
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { FilmkitError, FORMATS, PACKAGE } from "./studio.js";

const TEMPLATES = join(PACKAGE, "templates");
/** The smoke film mounts every kit scene, so a new studio checks the kit in its own theme from the start. */
const SMOKE = join(PACKAGE, "examples", "studio", "films", "smoke");
const SKILL = join(PACKAGE, "skills", "filmkit");
/** What a studio keeps out of git: both are rebuilt by the CLI. */
const IGNORED = ["build/", "renders/"];
// A film's name goes into file names (renders/<film>-<format>.mp4) and commands, so it stays plain.
const FILM_NAME = /^[a-z0-9][a-z0-9-]*$/;
const TEXT = new Set([".html", ".md", ".json"]);

/** The film templates: each folder of templates/ with an index.html. */
export function templates() {
  return readdirSync(TEMPLATES).filter((t) => existsSync(join(TEMPLATES, t, "index.html"))).sort();
}

/**
 * A studio in `dir`, for the brand `name` (the folder's name when not given). Files already there are kept, never
 * overwritten, so init can turn an existing repo into a studio; .gitignore gets only the lines it lacks.
 * @param {string} dir
 * @param {string} [name]
 * @returns {{ studio: string, name: string, files: string[], kept: string[] }}
 */
export function initStudio(dir, name) {
  const root = resolve(dir);
  if (existsSync(join(root, "filmkit.json"))) throw new FilmkitError(`${root} is already a studio. Make a film in it with: filmkit new <film>`);
  const vars = { name: name || basename(root) };
  /** @type {string[]} */
  const files = [], kept = [];
  /** @param {string} path @param {(to: string) => void} make */
  const add = (path, make) => {
    const to = join(root, path);
    if (existsSync(to)) return kept.push(to);
    mkdirSync(dirname(to), { recursive: true });
    make(to);
    files.push(to);
  };
  const config = `{\n  "name": ${JSON.stringify(vars.name)},\n  "formats": ${JSON.stringify(FORMATS).replaceAll(",", ", ")},\n  "theme": "default"\n}\n`;
  add("filmkit.json", (to) => writeFileSync(to, config));
  add("brand/logo.svg", (to) => cpSync(join(PACKAGE, "themes", "default", "logo", "logo.svg"), to));
  add("films/smoke", (to) => cpSync(SMOKE, to, { recursive: true }));
  for (const file of readdirSync(join(TEMPLATES, "studio"))) {
    add(file, (to) => writeFileSync(to, fill(readFileSync(join(TEMPLATES, "studio", file), "utf8"), vars)));
  }
  add(".claude/skills/filmkit", (to) => cpSync(SKILL, to, { recursive: true }));
  const gitignore = join(root, ".gitignore");
  const lines = existsSync(gitignore) ? readFileSync(gitignore, "utf8").split(/\r?\n/) : [];
  const missing = IGNORED.filter((line) => !lines.includes(line) && !lines.includes(line.slice(0, -1)));
  if (missing.length) {
    appendFileSync(gitignore, (lines.length && lines.at(-1) !== "" ? "\n" : "") + missing.join("\n") + "\n");
    files.push(gitignore);
  } else kept.push(gitignore);
  return { studio: root, name: vars.name, files, kept };
}

/**
 * A film in the studio from a template, and the template's placeholder rows in CLAIMS.md.
 * @param {import("./studio.js").Studio} studio
 * @param {string | undefined} film
 * @param {string} template
 * @returns {{ film: string, template: string, files: string[] }}
 */
export function newFilm(studio, film, template) {
  if (!film) throw new FilmkitError("name the film: filmkit new <film> [--template t]");
  if (!FILM_NAME.test(film)) throw new FilmkitError(`"${film}" can't be a film's name: use lowercase letters, digits and dashes, like launch-teaser`);
  const names = templates();
  if (!names.includes(template)) throw new FilmkitError(`no template "${template}" (templates: ${names.join(", ")})`);
  const dir = join(studio.dir, "films", film);
  if (existsSync(dir)) throw new FilmkitError(`films/${film} already exists: pick another name, or edit films/${film}/brief.md`);
  const from = join(TEMPLATES, template);
  const vars = { name: studio.name, film };
  cpSync(from, dir, { recursive: true, filter: (path) => path !== join(from, "claims.md") });
  const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).map((f) => join(dir, f)).filter((f) => statSync(f).isFile()).sort();
  for (const file of files.filter((f) => TEXT.has(extname(f)))) {
    writeFileSync(file, fill(readFileSync(file, "utf8"), vars, extname(file) === ".html" ? inAttribute : undefined));
  }
  const claims = join(studio.dir, "CLAIMS.md");
  appendFileSync(claims, `\n## ${film}\n\n${fill(readFileSync(join(from, "claims.md"), "utf8"), vars)}`);
  return { film, template, files: [...files, claims] };
}

/**
 * The template with its {{placeholders}} filled in.
 * @param {string} text
 * @param {Record<string, string>} vars
 * @param {(value: string) => string} [escape]
 */
function fill(text, vars, escape = (v) => v) {
  return text.replace(/\{\{(\w+)\}\}/g, (all, key) => (key in vars ? escape(vars[key]) : all));
}

/**
 * A value for a JSON string inside a single-quoted attribute, which is where a template's index.html puts {{name}}:
 * data-variable-values='{"text":"{{name}}, in one line."}'.
 * @param {string} value
 */
function inAttribute(value) {
  return JSON.stringify(value).slice(1, -1).replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}
