// init and new: a studio, and films in it, made from the package's templates/. templates/studio/ holds the studio's
// own files; every other folder with an index.html is a film template. {{name}} (the brand, from filmkit.json) and
// {{film}} are filled in as a template is copied, and its claims.md becomes the film's section of the studio's
// CLAIMS.md, each placeholder row flagged ⚑, so a film can't be posted with a template's words.
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fail } from "./errors.js";
import { HYPERFRAMES } from "./hyperframes.js";
import { FORMATS, PACKAGE } from "./studio.js";

const TEMPLATES = join(PACKAGE, "templates");
/** The smoke film mounts every kit scene, so a new studio checks the kit in its own theme from the start. */
const SMOKE = join(PACKAGE, "examples", "studio", "films", "smoke");
const SKILL = join(PACKAGE, "skills", "filmkit");
/** For an AGENTS.md that doesn't point to the HyperFrames skills yet. */
const SKILLS_POINTER = `## Skills

Read \`.claude/skills/filmkit/SKILL.md\` before you make or change a film, and \`.claude/skills/hyperframes/SKILL.md\`
before you write its HTML. \`npx filmkit skills\` installs them, matched to the HyperFrames that renders.
`;
/** What a studio keeps out of git: both are rebuilt by the CLI. */
const IGNORED = ["build/", "renders/"];
// A film's name goes into file names (renders/<film>-<format>.mp4) and commands, so it stays plain.
const FILM_NAME = /^[a-z0-9][a-z0-9-]*$/;
const TEXT = new Set([".html", ".md", ".json"]);

/** Throws unless `film` is a plain film name: it becomes a path under films/. @param {string} film */
export function plainName(film) {
  if (!FILM_NAME.test(film)) throw fail("bad_film_name", { film });
}

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
  if (existsSync(join(root, "filmkit.json"))) throw fail("studio_exists", { dir: root });
  const vars = { name: name || basename(root) };
  /** @type {string[]} */
  const files = [];
  /** @type {string[]} */
  const kept = [];
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
  (ignore(root, IGNORED) ? files : kept).push(join(root, ".gitignore"));
  return { studio: root, name: vars.name, files, kept };
}

/**
 * The filmkit skill, and the skills the pinned HyperFrames ships (from `hyperframesSkills`, its dist/skills folder),
 * into the studio's .claude/skills/, each replacing its older copy; the studio's other skills are left alone. The
 * HyperFrames skills are git-ignored, since `filmkit skills` makes them again from the pin, and AGENTS.md gets a
 * pointer to them when it has none.
 * @param {import("./studio.js").Studio} studio
 * @param {string} hyperframesSkills
 * @returns {{ skills: { name: string, from: string, path: string }[], files: string[] }}
 */
export function installSkills(studio, hyperframesSkills) {
  const hyperframes = readdirSync(hyperframesSkills).filter((n) => existsSync(join(hyperframesSkills, n, "SKILL.md"))).sort();
  if (!hyperframes.length) throw fail("hyperframes_no_skills", { dir: hyperframesSkills });
  const sources = [{ name: "filmkit", from: "filmkit", dir: SKILL }, ...hyperframes.map((name) => ({ name, from: HYPERFRAMES, dir: join(hyperframesSkills, name) }))];
  const skills = sources.map(({ name, from, dir }) => {
    const path = join(studio.dir, ".claude", "skills", name);
    rmSync(path, { recursive: true, force: true });
    cpSync(dir, path, { recursive: true });
    return { name, from, path };
  });
  /** @type {string[]} */
  const files = [];
  if (ignore(studio.dir, hyperframes.map((name) => `.claude/skills/${name}/`))) files.push(join(studio.dir, ".gitignore"));
  const agents = join(studio.dir, "AGENTS.md");
  const text = existsSync(agents) ? readFileSync(agents, "utf8") : "";
  if (!text.includes(".claude/skills/hyperframes/")) {
    appendFileSync(agents, (text && !text.endsWith("\n") ? "\n" : "") + (text ? "\n" : "") + SKILLS_POINTER);
    files.push(agents);
  }
  return { skills, files };
}

/**
 * Adds the lines the studio's .gitignore lacks (a line without its trailing slash counts), and says whether it did.
 * @param {string} root
 * @param {string[]} wanted
 */
function ignore(root, wanted) {
  const gitignore = join(root, ".gitignore");
  const lines = existsSync(gitignore) ? readFileSync(gitignore, "utf8").split(/\r?\n/) : [];
  const missing = wanted.filter((line) => !lines.includes(line) && !lines.includes(line.slice(0, -1)));
  if (missing.length) appendFileSync(gitignore, (lines.length && lines.at(-1) !== "" ? "\n" : "") + missing.join("\n") + "\n");
  return missing.length > 0;
}

/**
 * A film in the studio from a template, and the template's placeholder rows in CLAIMS.md.
 * @param {import("./studio.js").Studio} studio
 * @param {string | undefined} film
 * @param {string} template
 * @returns {{ film: string, template: string, files: string[] }}
 */
export function newFilm(studio, film, template) {
  if (!film) throw fail("new_unnamed");
  plainName(film);
  const names = templates();
  if (!names.includes(template)) throw fail("unknown_template", { film, template, templates: names });
  const dir = join(studio.dir, "films", film);
  if (existsSync(dir)) throw fail("film_exists", { film });
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
