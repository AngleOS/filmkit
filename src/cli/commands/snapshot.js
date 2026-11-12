import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { assemble } from "../../build/assemble.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "snapshot <film> [format] [--at t,t,…] [--frames n]";
export const summary = "PNG frames of one format (the film's first by default), so you can look at them";
export const options = { at: { type: /** @type {const} */ ("string") }, frames: { type: /** @type {const} */ ("string") } };

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, json, log }) {
  const studio = openStudio(process.cwd());
  const film = openFilm(studio, args[0]);
  const [format] = resolveFormats(studio, film, args.slice(1, 2));
  const out = join(studio.dir, "build", film.name, "snapshots", format);
  rmSync(out, { recursive: true, force: true });
  const flags = [["--at", options.at], ["--frames", options.frames]].flatMap(([k, v]) => (v ? [`${k}=${v}`] : []));
  const ok = hyperframes(["snapshot", "-o", out, ...flags], { cwd: assemble(studio, film, format), toStderr: json });
  const files = ok ? readdirSync(out).sort() : [];
  const frames = files.filter((f) => f.endsWith(".png")).map((f) => join(out, f));
  const sheet = files.includes("contact-sheet.jpg") ? join(out, "contact-sheet.jpg") : null;
  [...frames, sheet].forEach((f) => f && log(f));
  return { ok, film: film.name, format, frames, sheet };
}
