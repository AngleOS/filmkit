import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readCaptions, writeCaptions } from "../../build/captions.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";
import { checkFilm, lastPass } from "./check.js";

export const usage = "render <film> [formats…] [--force]";
export const summary = "check, then renders/<film>-<format>.mp4 at delivery quality, plus .srt and .vtt, keeping MP4s still current (--force redoes all); exits 1 on a failed check, 4 on a failed render";
export const options = { force: { type: /** @type {const} */ ("boolean") } };

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, json, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  // Read before the long renders, so a broken captions host fails first rather than after every MP4.
  const lines = readCaptions(film);
  const force = options.force === true;
  const checked = await checkFilm(studio, film, resolveFormats(studio, film, args.slice(1)), log, force);
  if (!checked.ok) return { ...checked, renders: [] };
  const renders = studio.renders;
  mkdirSync(renders, { recursive: true });
  const failed = [];
  const rendered = [];
  // Renders run one at a time: each already spreads its frames over Chrome workers on every core.
  for (const { format, dir } of checked.formats) {
    const path = join(renders, `${film.name}-${format}.mp4`);
    const made = join(dirname(dir), `render-${format}.json`);
    const hash = /** @type {{ hash: string }} */ (lastPass(dir)).hash;
    const current = !force && renderedFrom(made, path) === hash;
    if (!current) {
      // No record while it renders, so an interrupted render is redone next time.
      rmSync(made, { force: true });
      if (!hyperframes(["render", "-q", "delivery", "-o", path], { cwd: dir, toStderr: json }).ok) {
        failed.push(format);
        continue;
      }
      writeFileSync(made, JSON.stringify({ hash, bytes: statSync(path).size }) + "\n");
    }
    rendered.push({ format, path, seconds: +film.root["data-duration"], bytes: statSync(path).size });
    log(current ? `${path} unchanged` : path);
  }
  const { srt, vtt } = writeCaptions(studio, film, lines);
  if (srt) log(`${srt}\n${vtt}`);
  if (failed.length) log(`✗ ${film.name}: render failed in ${failed.join(", ")}`);
  return { film: film.name, ok: !failed.length, renders: rendered, captions: { srt, vtt }, ...(failed.length && { failed, exit: 4 }) };
}

/**
 * The hash of the inputs `path` was rendered from, while it's still the file that render made; else null.
 * @param {string} made the render's record
 * @param {string} path the MP4
 */
function renderedFrom(made, path) {
  try {
    const { hash, bytes } = JSON.parse(readFileSync(made, "utf8"));
    return existsSync(path) && statSync(path).size === bytes ? hash : null;
  } catch {
    return null;
  }
}
