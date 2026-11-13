// build/<film>/<format>/ is a HyperFrames project: the film, a copy of the kit with the studio's theme (its folders,
// and the theme.css and brand.js compiled from them), and the format's canvas size on the root composition. The kit is copied,
// never linked, because HyperFrames won't read a scene through a symlink that leaves the project.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PACKAGE, SIZES } from "../studio.js";
import { brandJs, themeCss } from "../theme.js";
import { setRootSize } from "./html.js";

const GSAP = createRequire(import.meta.url).resolve("gsap/dist/gsap.min.js");
const PROJECT = fileURLToPath(new URL("hyperframes.json", import.meta.url));
/** What stays in the film's folder: the master is written sized, and sound is built from sound.json, not copied. */
export const OWN = new Set(["index.html", "sound.json"]);

/**
 * Assembles one format of a film and returns its directory: build/<film>/<format>/ unless `out` names another.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} format
 */
export function assemble(studio, film, format, out = buildDir(studio, film, format)) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(PACKAGE, "kit"), join(out, "kit"), { recursive: true });
  cpSync(GSAP, join(out, "kit", "vendor", "gsap.min.js"));
  for (const dir of studio.theme.dirs) cpSync(dir, join(out, "kit", "theme"), { recursive: true });
  compileTheme(studio, join(out, "kit", "theme"));
  for (const entry of readdirSync(film.dir)) {
    if (!OWN.has(entry)) cpSync(join(film.dir, entry), join(out, entry), { recursive: true });
  }
  writeMaster(out, film.html, format);
  writeFileSync(join(out, "meta.json"), JSON.stringify({ id: `${film.name}-${format}`, name: `${film.name} ${format}` }) + "\n");
  cpSync(PROJECT, join(out, "hyperframes.json"));
  return out;
}

/**
 * Writes the theme's compiled files into a build's kit/theme/, over the copies of its folders' own.
 * @param {import("../studio.js").Studio} studio
 * @param {string} dir
 */
export function compileTheme(studio, dir) {
  writeFileSync(join(dir, "theme.css"), themeCss(studio.theme.values));
  writeFileSync(join(dir, "brand.js"), brandJs(studio.theme, studio.name));
}

/**
 * Writes the film's master into `out`, its root composition sized for the format.
 * @param {string} out
 * @param {string} html
 * @param {string} format
 */
export function writeMaster(out, html, format) {
  const [width, height] = SIZES[/** @type {keyof SIZES} */ (format)];
  writeFileSync(join(out, "index.html"), setRootSize(html, width, height));
}

/**
 * What a format is assembled from, by name: a change in any of them changes the format. The theme counts by its folders
 * and its logo here; its values and the studio's name, which compile to theme.css and brand.js, count in the hash.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 */
export function sources(studio, film) {
  const { dirs, mark } = studio.theme;
  const themes = Object.fromEntries(dirs.map((dir, i) => [`theme-${i}`, dir]));
  return { kit: join(PACKAGE, "kit"), gsap: GSAP, ...themes, ...(mark && { mark }), film: film.dir, project: PROJECT };
}

/**
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} format
 */
export const buildDir = (studio, film, format) => join(studio.dir, "build", film.name, format);
