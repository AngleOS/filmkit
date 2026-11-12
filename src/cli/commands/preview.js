import { assemble } from "../../build/assemble.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "preview <film> [format]";
export const summary = "HyperFrames Studio on one format; edit films/, never build/ (it's rebuilt every run)";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, json }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  const [format] = resolveFormats(studio, film, args.slice(1, 2));
  const dir = assemble(studio, film, format);
  const { ok } = hyperframes(["preview"], { cwd: dir, toStderr: json });
  return { film: film.name, format, ok, dir, ...(!ok && { exit: 4 }) };
}
