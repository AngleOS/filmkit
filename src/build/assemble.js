// build/<film>/<format>/ is a HyperFrames project: the film, a copy of the kit with the studio's theme, the film's
// sound when it has been built, and the format's canvas size on the root composition. The kit is copied, never
// linked, because HyperFrames won't read a scene through a symlink that leaves the project.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PACKAGE, SIZES } from "../studio.js";
import { mountAudio, setRootSize } from "./html.js";
import { soundPath } from "./sound.js";

const GSAP = createRequire(import.meta.url).resolve("gsap/dist/gsap.min.js");
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
  // kit/sound/ makes the sound in Node; the page only plays the result.
  cpSync(join(PACKAGE, "kit"), join(out, "kit"), { recursive: true, filter: (src) => src !== join(PACKAGE, "kit", "sound") });
  cpSync(GSAP, join(out, "kit", "vendor", "gsap.min.js"));
  cpSync(studio.themeDir, join(out, "kit", "theme"), { recursive: true });
  for (const entry of readdirSync(film.dir)) {
    if (!OWN.has(entry)) cpSync(join(film.dir, entry), join(out, entry), { recursive: true });
  }
  const [width, height] = SIZES[/** @type {keyof SIZES} */ (format)];
  let html = setRootSize(film.html, width, height);
  if (existsSync(soundPath(studio, film))) {
    cpSync(soundPath(studio, film), join(out, "sound.m4a"));
    html = mountAudio(html, "sound.m4a");
  }
  writeFileSync(join(out, "index.html"), html);
  writeFileSync(join(out, "meta.json"), JSON.stringify({ id: `${film.name}-${format}`, name: `${film.name} ${format}` }) + "\n");
  cpSync(new URL("hyperframes.json", import.meta.url), join(out, "hyperframes.json"));
  return out;
}

/**
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} format
 */
export const buildDir = (studio, film, format) => join(studio.dir, "build", film.name, format);
