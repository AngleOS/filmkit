import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { assemble } from "../../build/assemble.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "snapshot <film> [format] [--at t,t,…] [--frames n]";
export const summary = "PNG frames and a contact sheet of one format (the film's first by default), to look at";
export const options = { at: { type: /** @type {const} */ ("string") }, frames: { type: /** @type {const} */ ("string") } };

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, json, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  const [format] = resolveFormats(studio, film, args.slice(1, 2));
  const out = join(studio.dir, "build", film.name, `snaps-${format}`);
  rmSync(out, { recursive: true, force: true });
  const flags = [["--at", options.at], ["--frames", options.frames]].flatMap(([k, v]) => (v ? [`${k}=${v}`] : []));
  // Only the asked times (no end frame), and no Gemini description when GEMINI_API_KEY happens to be set.
  if (options.at) flags.push("--no-end");
  flags.push("--describe=false");
  const { ok } = hyperframes(["snapshot", "-o", out, ...flags], { cwd: assemble(studio, film, format), toStderr: json });
  const files = ok ? readdirSync(out).sort() : [];
  // HyperFrames names each frame for its time: frame-03-at-6.5s.png
  const frames = files.flatMap((f) => {
    const t = f.match(/^frame-\d+-at-([\d.]+)s\.png$/)?.[1];
    return t ? [{ t: +t, path: join(out, f) }] : [];
  });
  const sheet = files.includes("contact-sheet.jpg") ? join(out, "contact-sheet.jpg") : null;
  [...frames.map((f) => f.path), sheet].forEach((p) => p && log(p));
  return { film: film.name, format, ok, frames, sheet, ...(!ok && { exit: 4 }) };
}
