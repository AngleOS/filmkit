import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";
import { checkFilm } from "./check.js";

export const usage = "render <film> [formats…]";
export const summary = "check, then renders/<film>-<format>.mp4 at delivery quality";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, json, log }) {
  const studio = openStudio(process.cwd());
  const film = openFilm(studio, args[0]);
  const checked = checkFilm(studio, film, resolveFormats(studio, film, args.slice(1)), { json, log });
  if (!checked.ok) return { ...checked, renders: [] };
  const renders = join(studio.dir, "renders");
  mkdirSync(renders, { recursive: true });
  const rendered = checked.formats.map(({ format, dir }) => {
    const file = join(renders, `${film.name}-${format}.mp4`);
    return { format, file, ok: hyperframes(["render", "-q", "delivery", "-o", file], { cwd: dir, toStderr: json }) };
  });
  rendered.filter((r) => r.ok).forEach((r) => log(r.file));
  return { ok: rendered.every((r) => r.ok), film: film.name, renders: rendered };
}
