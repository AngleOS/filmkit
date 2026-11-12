// build/<film>/<format>/ is a HyperFrames project: the film, a copy of the kit with the studio's theme, and the
// format's canvas size on the root composition. The kit is copied, never linked, because HyperFrames won't read a
// scene through a symlink that leaves the project.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PACKAGE, SIZES } from "../studio.js";
import { setRootSize } from "./html.js";

const GSAP = createRequire(import.meta.url).resolve("gsap/dist/gsap.min.js");
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
  cpSync(studio.themeDir, join(out, "kit", "theme"), { recursive: true });
  for (const entry of readdirSync(film.dir)) {
    if (!OWN.has(entry)) cpSync(join(film.dir, entry), join(out, entry), { recursive: true });
  }
  writeMaster(out, film.html, format);
  writeFileSync(join(out, "meta.json"), JSON.stringify({ id: `${film.name}-${format}`, name: `${film.name} ${format}` }) + "\n");
  cpSync(new URL("hyperframes.json", import.meta.url), join(out, "hyperframes.json"));
  return out;
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
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} format
 */
export const buildDir = (studio, film, format) => join(studio.dir, "build", film.name, format);
