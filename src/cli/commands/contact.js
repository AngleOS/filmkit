import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { assemble } from "../../build/assemble.js";
import { MAX_FRAMES, contactTimes, tile } from "../../build/contact.js";
import { hyperframes } from "../../hyperframes.js";
import { FilmkitError, openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "contact <film> [formats…] [--every 2s | --at t,t,…]";
export const summary = "a labelled contact sheet per format, build/<film>/contact-<format>.png: each scene just after it starts, or at the times given";
export const options = { every: { type: /** @type {const} */ ("string") }, at: { type: /** @type {const} */ ("string") } };

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, json, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  const formats = resolveFormats(studio, film, args.slice(1));
  const times = contactTimes(film, when(/** @type {string | undefined} */ (options.every), /** @type {string | undefined} */ (options.at)));
  const late = times.filter((t) => t >= +film.root["data-duration"]);
  if (late.length) throw new FilmkitError(`--at ${late.join(",")}: past the end of ${film.name} (${film.root["data-duration"]} s)`);
  if (!times.length) throw new FilmkitError(`films/${film.name} has no scenes to look at: give times with --at t,t,…`);
  if (times.length > MAX_FRAMES) throw new FilmkitError(`${times.length} frames is too many for one sheet (at most ${MAX_FRAMES}): use a larger --every`);
  const failed = [];
  const sheets = [];
  for (const format of formats) {
    const frames = snapshot(studio, film, format, times, json);
    const path = join(studio.dir, "build", film.name, `contact-${format}.png`);
    if (!frames.length || !tile(frames, format, join(studio.dir, "build", film.name, `contact-${format}`), path)) {
      failed.push(format);
      continue;
    }
    sheets.push({ format, path, times: frames.map((f) => f.t) });
    log(path);
  }
  if (failed.length) log(`✗ ${film.name}: contact sheet failed in ${failed.join(", ")}`);
  return { film: film.name, ok: !failed.length, sheets, ...(failed.length && { failed, exit: 4 }) };
}

/**
 * The times option, checked: `--every 2s` (or `2`), or `--at 0,1.5,3`.
 * @param {string | undefined} every
 * @param {string | undefined} at
 */
function when(every, at) {
  if (every && at) throw new FilmkitError("give --every or --at, not both");
  if (every) {
    const step = +every.replace(/s$/, "");
    if (!(step > 0)) throw new FilmkitError(`--every ${every}: say how often, in seconds, such as --every 2s`);
    return { every: step };
  }
  if (at) {
    const times = at.split(",").map((t) => +t.trim().replace(/s$/, ""));
    if (times.some((t) => !(t >= 0))) throw new FilmkitError(`--at ${at}: list times in seconds, such as --at 0,2.5,6`);
    return { at: times };
  }
  return {};
}

/**
 * One format's frames at `times`, in build/<film>/contact-<format>/; none when the snapshot failed.
 * @param {import("../../studio.js").Studio} studio
 * @param {import("../../studio.js").Film} film
 * @param {string} format
 * @param {number[]} times
 * @param {boolean} json
 */
function snapshot(studio, film, format, times, json) {
  const out = join(studio.dir, "build", film.name, `contact-${format}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  // Only the asked times (no end frame), and no Gemini description when GEMINI_API_KEY happens to be set.
  const flags = [`--at=${times.join(",")}`, "--no-end", "--describe=false", "-o", out];
  if (!hyperframes(["snapshot", ...flags], { cwd: assemble(studio, film, format), toStderr: json }).ok) return [];
  // HyperFrames names each frame for its order and time: frame-03-at-6.5s.png
  return readdirSync(out)
    .sort()
    .flatMap((f) => {
      const t = f.match(/^frame-\d+-at-([\d.]+)s\.png$/)?.[1];
      return t ? [{ t: +t, path: join(out, f) }] : [];
    });
}
