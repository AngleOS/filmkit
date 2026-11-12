import { join } from "node:path";
import { assemble } from "../../build/assemble.js";
import { isLoop, measureSeam } from "../../build/seam.js";
import { describe } from "../../errors.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "check <film> [formats…]";
export const summary = "assemble each format and run `hyperframes check` on it, and a loop's seam gate; exits 1 when any format fails";

/**
 * @typedef {{ code: string, message: string, selector?: string }} Finding
 * @typedef {import("../../build/seam.js").Seam | { ok: false, error: string }} SeamCheck
 * @typedef {{ format: string, dir: string, ok: boolean, errors: Finding[], warnings: Finding[], seam?: SeamCheck }} FormatCheck
 */

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  return checkFilm(studio, film, resolveFormats(studio, film, args.slice(1)), log);
}

/**
 * Every format assembled and checked; the result says which passed, and why not.
 * @param {import("../../studio.js").Studio} studio
 * @param {import("../../studio.js").Film} film
 * @param {string[]} formats
 * @param {import("../index.js").Context["log"]} log
 */
export function checkFilm(studio, film, formats, log) {
  const loop = isLoop(film.root);
  const checked = formats.map((format) => {
    const dir = assemble(studio, film, format);
    log(`── ${film.name} ${format}`);
    /** @type {FormatCheck} */
    const result = { format, dir, ...findings(hyperframes(["check", "--json"], { cwd: dir, capture: true })) };
    for (const e of result.errors) log(`  ✗ ${e.code}: ${e.message}${e.selector ? ` (${e.selector})` : ""}`);
    for (const w of result.warnings) log(`  ⚠ ${w.code}: ${w.message}${w.selector ? ` (${w.selector})` : ""}`);
    if (loop) {
      const out = join(studio.dir, "build", film.name, `seam-${format}`);
      result.seam = measureSeam(dir, Number(film.root["data-duration"]), out) ?? { ok: false, error: "the seam frames didn't render" };
      result.ok &&= result.seam.ok;
      log(seamLine(result.seam));
    }
    return result;
  });
  const failed = checked.filter((c) => !c.ok).map((c) => c.format);
  log(failed.length ? `✗ ${film.name}: check failed in ${failed.join(", ")}` : `✓ ${film.name}: ${formats.join(", ")}`);
  return { film: film.name, ok: !failed.length, formats: checked };
}

/** @param {SeamCheck} seam */
function seamLine(seam) {
  if ("error" in seam) return `  ✗ seam: ${seam.error}`;
  const measured = `step ${seam.step}, limit ${seam.limit} (median step at the ends ${seam.median})`;
  return seam.ok ? `  ✓ seam: ${measured}` : `  ✗ seam: the last frame doesn't flow into frame 0: ${measured}`;
}

/**
 * The errors and warnings in `hyperframes check --json`'s report, from every pass (lint, runtime, layout, motion,
 * contrast, craft).
 * @param {{ ok: boolean, stdout: string }} run
 * @returns {{ ok: boolean, errors: Finding[], warnings: Finding[] }}
 */
export function findings({ ok, stdout }) {
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    return { ok: false, errors: [{ code: "no_report", message: describe("no_report").message }], warnings: [] };
  }
  /** @type {{ severity: string, code: string, message: string, selector?: string }[]} */
  const all = Object.values(report).flatMap((pass) => (Array.isArray(pass?.findings) ? pass.findings : []));
  /** @param {string} severity */
  const of = (severity) => all.filter((f) => f.severity === severity).map(({ code, message, selector }) => ({ code, message, ...(selector && { selector }) }));
  return { ok: ok && report.ok !== false, errors: of("error"), warnings: of("warning") };
}
