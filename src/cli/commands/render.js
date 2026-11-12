import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readCaptions, writeCaptions } from "../../build/captions.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";
import { checkFilm } from "./check.js";

export const usage = "render <film> [formats…]";
export const summary = "check, then renders/<film>-<format>.mp4 at delivery quality, plus .srt and .vtt; exits 1 on a failed check, 4 on a failed render";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, json, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  // Read before the long renders, so a broken captions host fails first rather than after every MP4.
  const lines = readCaptions(film);
  const checked = checkFilm(studio, film, resolveFormats(studio, film, args.slice(1)), log);
  if (!checked.ok) return { ...checked, renders: [] };
  const renders = studio.renders;
  mkdirSync(renders, { recursive: true });
  const failed = [];
  const rendered = [];
  for (const { format, dir } of checked.formats) {
    const path = join(renders, `${film.name}-${format}.mp4`);
    if (!hyperframes(["render", "-q", "delivery", "-o", path], { cwd: dir, toStderr: json }).ok) {
      failed.push(format);
      continue;
    }
    rendered.push({ format, path, seconds: +film.root["data-duration"], bytes: statSync(path).size });
    log(path);
  }
  const { srt, vtt } = writeCaptions(studio, film, lines);
  if (srt) log(`${srt}\n${vtt}`);
  if (failed.length) log(`✗ ${film.name}: render failed in ${failed.join(", ")}`);
  return { film: film.name, ok: !failed.length, renders: rendered, captions: { srt, vtt }, ...(failed.length && { failed, exit: 4 }) };
}
