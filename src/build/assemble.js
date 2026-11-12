// build/<film>/<format>/ is a HyperFrames project: the film, a copy of the kit with the studio's theme (its folders
// and the theme.css compiled from them), and the format's canvas size on the root composition. The kit is copied,
// never linked, because HyperFrames won't read a scene through a symlink that leaves the project.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PACKAGE, SIZES } from "../studio.js";
import { themeCss } from "../theme.js";
import { setRootSize } from "./html.js";

const GSAP = createRequire(import.meta.url).resolve("gsap/dist/gsap.min.js");
const PROJECT = fileURLToPath(new URL("hyperframes.json", import.meta.url));
/** What stays in the film's folder: the master is written sized, and sound is built from sound.json, not copied. */
const OWN = new Set(["index.html", "sound.json"]);

/**
 * Assembles one format of a film and returns its directory.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} format
 */
export function assemble(studio, film, format) {
  const out = buildDir(studio, film, format);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(PACKAGE, "kit"), join(out, "kit"), { recursive: true });
  cpSync(GSAP, join(out, "kit", "vendor", "gsap.min.js"));
  for (const dir of studio.theme.dirs) cpSync(dir, join(out, "kit", "theme"), { recursive: true });
  writeFileSync(join(out, "kit", "theme", "theme.css"), themeCss(studio.theme.values));
  for (const entry of readdirSync(film.dir)) {
    if (!OWN.has(entry)) cpSync(join(film.dir, entry), join(out, entry), { recursive: true });
  }
  const [width, height] = SIZES[/** @type {keyof SIZES} */ (format)];
  writeFileSync(join(out, "index.html"), setRootSize(film.html, width, height));
  writeFileSync(join(out, "meta.json"), JSON.stringify({ id: `${film.name}-${format}`, name: `${film.name} ${format}` }) + "\n");
  cpSync(PROJECT, join(out, "hyperframes.json"));
  return out;
}

/**
 * The files a format is assembled from, by name: a change in any of them changes the format. The theme's merged
 * values aren't files (filmkit.json can override them), so the hash takes them on their own.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @returns {Record<string, string>}
 */
export const sources = (studio, film) => ({
  kit: join(PACKAGE, "kit"),
  gsap: GSAP,
  ...Object.fromEntries(studio.theme.dirs.map((dir, i) => [`theme${i}`, dir])),
  film: film.dir,
  project: PROJECT,
});

/**
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} format
 */
export const buildDir = (studio, film, format) => join(studio.dir, "build", film.name, format);
