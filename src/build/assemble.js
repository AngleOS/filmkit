// build/<film>/<format>/ is a HyperFrames project: the film, a copy of the kit with the studio's theme (its folders
// and the theme.css compiled from them), the film's sound when it has been built, and the format's canvas size on the
// root composition. The kit is copied, never linked, because HyperFrames won't read a scene through a symlink that
// leaves the project.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PACKAGE, SIZES } from "../studio.js";
import { themeCss } from "../theme.js";
import { mountAudio, setRootSize } from "./html.js";
import { soundPath } from "./sound.js";

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
  // kit/sound/ makes the sound in Node; the page only plays the result.
  cpSync(join(PACKAGE, "kit"), join(out, "kit"), { recursive: true, filter: (src) => src !== join(PACKAGE, "kit", "sound") });
  cpSync(GSAP, join(out, "kit", "vendor", "gsap.min.js"));
  for (const dir of studio.theme.dirs) cpSync(dir, join(out, "kit", "theme"), { recursive: true });
  writeFileSync(join(out, "kit", "theme", "theme.css"), themeCss(studio.theme.values));
  for (const entry of readdirSync(film.dir)) {
    if (!OWN.has(entry)) cpSync(join(film.dir, entry), join(out, entry), { recursive: true });
  }
  if (existsSync(soundPath(studio, film))) cpSync(soundPath(studio, film), join(out, "sound.m4a"));
  writeMaster(out, film.html, format);
  writeFileSync(join(out, "meta.json"), JSON.stringify({ id: `${film.name}-${format}`, name: `${film.name} ${format}` }) + "\n");
  cpSync(PROJECT, join(out, "hyperframes.json"));
  return out;
}

/**
 * Writes the film's master into `out`, its root composition sized for the format, with the film's sound mounted when
 * the build has it.
 * @param {string} out
 * @param {string} html
 * @param {string} format
 */
export function writeMaster(out, html, format) {
  const [width, height] = SIZES[/** @type {keyof SIZES} */ (format)];
  const sized = setRootSize(html, width, height);
  writeFileSync(join(out, "index.html"), existsSync(join(out, "sound.m4a")) ? mountAudio(sized, "sound.m4a") : sized);
}

/**
 * What a format is assembled from, by name: a change in any of them changes the format. The theme counts by its folders
 * here; its values, which compile to theme.css, count in the hash. The film's sound counts once it's built, so build it
 * first.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 */
export function sources(studio, film) {
  const sound = soundPath(studio, film);
  const themes = Object.fromEntries(studio.theme.dirs.map((dir, i) => [`theme-${i}`, dir]));
  return { kit: join(PACKAGE, "kit"), gsap: GSAP, ...themes, film: film.dir, project: PROJECT, ...(existsSync(sound) && { sound }) };
}

/**
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} format
 */
export const buildDir = (studio, film, format) => join(studio.dir, "build", film.name, format);
