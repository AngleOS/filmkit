import { assemble } from "../../build/assemble.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "preview <film> [format]";
export const summary = "HyperFrames Studio on one format; edit films/, never build/ (it's rebuilt every run)";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, json }) {
  const studio = openStudio(process.cwd());
  const film = openFilm(studio, args[0]);
  const [format] = resolveFormats(studio, film, args.slice(1, 2));
  const dir = assemble(studio, film, format);
  return { ok: hyperframes(["preview"], { cwd: dir, toStderr: json }), film: film.name, format, dir };
}
