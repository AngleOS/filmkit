import { assemble } from "../../build/assemble.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "check <film> [formats…]";
export const summary = "assemble each format and run `hyperframes check` on it; non-zero exit on failure";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, json, log }) {
  const studio = openStudio(process.cwd());
  const film = openFilm(studio, args[0]);
  return checkFilm(studio, film, resolveFormats(studio, film, args.slice(1)), { json, log });
}

/**
 * Every format assembled and checked; the result says which passed.
 * @param {import("../../studio.js").Studio} studio
 * @param {import("../../studio.js").Film} film
 * @param {string[]} formats
 * @param {Pick<import("../index.js").Context, "json" | "log">} ctx
 */
export function checkFilm(studio, film, formats, { json, log }) {
  const checked = formats.map((format) => {
    const dir = assemble(studio, film, format);
    log(`── ${film.name} ${format}`);
    return { format, dir, ok: hyperframes(["check"], { cwd: dir, toStderr: json }) };
  });
  const failed = checked.filter((c) => !c.ok).map((c) => c.format);
  log(failed.length ? `✗ ${film.name}: check failed in ${failed.join(", ")}` : `✓ ${film.name}: ${formats.join(", ")}`);
  return { ok: !failed.length, film: film.name, formats: checked };
}
