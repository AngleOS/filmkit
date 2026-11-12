import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ffmpeg } from "../../ffmpeg.js";
import { hyperframes } from "../../hyperframes.js";
import { FilmkitError, openFilm, openStudio, resolveFormats } from "../../studio.js";
import { checkFilm } from "./check.js";

export const usage = "stills <film> <t> [formats…]";
export const summary = "check, then a poster per format at <t> s, renders/<film>-<format>.png, and a 1280×720 thumbnail from 16x9";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, json, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  const at = args[1];
  if (!at || !(+at >= 0)) throw new FilmkitError("say when, in seconds: stills <film> <t> [formats…]");
  const checked = checkFilm(studio, film, resolveFormats(studio, film, args.slice(2)), log);
  if (!checked.ok) return { ...checked, stills: [] };
  const renders = studio.renders;
  mkdirSync(renders, { recursive: true });
  const failed = [];
  const stills = [];
  for (const { format, dir } of checked.formats) {
    const out = join(studio.dir, "build", film.name, `stills-${format}`);
    rmSync(out, { recursive: true, force: true });
    // Only the asked instant (no end frame), and no Gemini description when GEMINI_API_KEY happens to be set.
    const { ok } = hyperframes(["snapshot", `--at=${at}`, "--no-end", "--describe=false", "-o", out], { cwd: dir, toStderr: json });
    const frame = ok && readdirSync(out).find((f) => /^frame-\d+-at-[\d.]+s\.png$/.test(f));
    if (!frame) {
      failed.push(format);
      continue;
    }
    const path = join(renders, `${film.name}-${format}.png`);
    copyFileSync(join(out, frame), path);
    stills.push({ format, path });
    log(path);
  }
  const wide = stills.find((s) => s.format === "16x9");
  const thumbnail = wide && join(renders, `${film.name}-thumbnail.png`);
  const thumbed = !thumbnail || ffmpeg(["-i", wide.path, "-vf", "scale=1280:720:flags=lanczos", thumbnail]);
  if (!thumbed) failed.push("thumbnail");
  else if (thumbnail) log(thumbnail);
  if (failed.length) log(`✗ ${film.name}: stills failed in ${failed.join(", ")}`);
  return { film: film.name, ok: !failed.length, stills, ...(thumbnail && thumbed && { thumbnail }), ...(failed.length && { failed, exit: 4 }) };
}
