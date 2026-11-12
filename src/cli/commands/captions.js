import { writeCaptions } from "../../build/captions.js";
import { openFilm, openStudio } from "../../studio.js";

export const usage = "captions <film>";
export const summary = "the captions scene's lines as renders/<film>.srt and .vtt, one pair for every format";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  const captions = writeCaptions(studio, film);
  log(captions.srt ? `${captions.srt}\n${captions.vtt}` : `${film.name}: no captions scene, no subtitle files`);
  return { film: film.name, ok: true, ...captions };
}
