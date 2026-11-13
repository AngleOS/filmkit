import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { assemble } from "../../build/assemble.js";
import { MAX_FRAMES, contactTimes, tile } from "../../build/contact.js";
import { fetchHyperframes, hyperframesAsync, lastWords } from "../../hyperframes.js";
import { fail } from "../../errors.js";
import { progress } from "../../progress.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "contact <film> [formats…] [--every 2s | --at t,t,…]";
export const summary = "a labelled contact sheet per format, build/<film>/contact-<format>.png: each scene just after it starts, or at the times given";
export const options = { every: { type: /** @type {const} */ ("string") }, at: { type: /** @type {const} */ ("string") } };

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, log, live = progress(log) }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  const formats = resolveFormats(studio, film, args.slice(1));
  const times = contactTimes(film, when(film.name, /** @type {string | undefined} */ (options.every), /** @type {string | undefined} */ (options.at)));
  const duration = +film.root["data-duration"];
  const late = times.filter((t) => t >= duration);
  if (late.length) throw fail("past_end", { film: film.name, late, duration });
  if (!times.length) throw fail("no_scenes", { film: film.name });
  if (times.length > MAX_FRAMES) throw fail("too_many_frames", { film: film.name, count: times.length, max: MAX_FRAMES, every: Math.ceil(duration / MAX_FRAMES) });
  const failed = [];
  const sheets = [];
  try {
    for (const format of formats) {
      live.step(format, "capturing");
      const frames = await snapshot(studio, film, format, times, live);
      live.end(format);
      const path = join(studio.dir, "build", film.name, `contact-${format}.png`);
      if (!frames.length || !tile(frames, format, join(studio.dir, "build", film.name, `contact-${format}`), path)) {
        failed.push(format);
        continue;
      }
      sheets.push({ format, path, times: frames.map((f) => f.t) });
      live.log(path);
    }
  } finally {
    live.close();
  }
  if (failed.length) log(`✗ ${film.name}: contact sheet failed in ${failed.join(", ")}`);
  return { film: film.name, ok: !failed.length, sheets, ...(failed.length && { failed, exit: 4 }) };
}

/**
 * The times option, checked: `--every 2s` (or `2`), or `--at 0,1.5,3`.
 * @param {string} film
 * @param {string | undefined} every
 * @param {string | undefined} at
 */
function when(film, every, at) {
  if (every && at) throw fail("times_both", { film });
  if (every) {
    const step = +every.replace(/s$/, "");
    if (!(step > 0)) throw fail("bad_times", { film, option: "--every", value: every });
    return { every: step };
  }
  if (at) {
    const times = at.split(",").map((t) => +t.trim().replace(/s$/, ""));
    if (times.some((t) => !(t >= 0))) throw fail("bad_times", { film, option: "--at", value: at });
    return { at: times };
  }
  return {};
}

/**
 * One format's frames at `times`, in build/<film>/contact-<format>/; none when the snapshot failed, with HyperFrames'
 * last words. Its own output (a GPU probe, each frame, a newer version) is held back: the progress line says it's
 * running, and inside setup's and tour's walkthroughs it would break their gutter.
 * @param {import("../../studio.js").Studio} studio
 * @param {import("../../studio.js").Film} film
 * @param {string} format
 * @param {number[]} times
 * @param {import("../../progress.js").Progress} live
 */
async function snapshot(studio, film, format, times, live) {
  const out = join(studio.dir, "build", film.name, `contact-${format}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  // Only the asked times (no end frame), and no Gemini description when GEMINI_API_KEY happens to be set.
  const flags = [`--at=${times.join(",")}`, "--no-end", "--describe=false", "-o", out];
  const cwd = assemble(studio, film, format);
  fetchHyperframes();
  const run = await hyperframesAsync(["snapshot", ...flags], { cwd });
  if (!run.ok) {
    live.log([`${format} ✗ snapshot failed`, ...lastWords(run).map((line) => `  ${line}`)].join("\n"));
    return [];
  }
  // HyperFrames names each frame for its order and time: frame-03-at-6.5s.png
  return readdirSync(out)
    .sort()
    .flatMap((f) => {
      const t = f.match(/^frame-\d+-at-([\d.]+)s\.png$/)?.[1];
      return t ? [{ t: +t, path: join(out, f) }] : [];
    });
}
