import { assemble } from "../../build/assemble.js";
import { hyperframes } from "../../hyperframes.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "check <film> [formats…]";
export const summary = "assemble each format and run `hyperframes check` on it; exits 1 when any format fails";

/**
 * @typedef {{ code: string, message: string, selector?: string }} Finding
 * @typedef {{ format: string, dir: string, ok: boolean, errors: Finding[], warnings: Finding[] }} FormatCheck
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
  const checked = formats.map((format) => {
    const dir = assemble(studio, film, format);
    log(`── ${film.name} ${format}`);
    const result = { format, dir, ...findings(hyperframes(["check", "--json"], { cwd: dir, capture: true })) };
    for (const e of result.errors) log(`  ✗ ${e.code}: ${e.message}${e.selector ? ` (${e.selector})` : ""}`);
    for (const w of result.warnings) log(`  ⚠ ${w.code}: ${w.message}${w.selector ? ` (${w.selector})` : ""}`);
    return result;
  });
  const failed = checked.filter((c) => !c.ok).map((c) => c.format);
  log(failed.length ? `✗ ${film.name}: check failed in ${failed.join(", ")}` : `✓ ${film.name}: ${formats.join(", ")}`);
  return { film: film.name, ok: !failed.length, formats: checked };
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
    return { ok: false, errors: [{ code: "hyperframes", message: "hyperframes check gave no report" }], warnings: [] };
  }
  /** @type {{ severity: string, code: string, message: string, selector?: string }[]} */
  const all = Object.values(report).flatMap((pass) => (Array.isArray(pass?.findings) ? pass.findings : []));
  /** @param {string} severity */
  const of = (severity) => all.filter((f) => f.severity === severity).map(({ code, message, selector }) => ({ code, message, ...(selector && { selector }) }));
  return { ok: ok && report.ok !== false, errors: of("error"), warnings: of("warning") };
}
