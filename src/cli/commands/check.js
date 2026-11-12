import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemble, buildDir } from "../../build/assemble.js";
import { formatHash } from "../../build/hash.js";
import { hyperframesAsync } from "../../hyperframes.js";
import { pool, slots } from "../../pool.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "check <film> [formats…] [--force]";
export const summary = "assemble each format and run `hyperframes check` on it, skipping formats unchanged since they passed (--force checks all); exits 1 when any format fails";
export const options = { force: { type: /** @type {const} */ ("boolean") } };

/** Where a format's last pass is kept: the hash of its inputs and the warnings it passed with. */
const PASSED = ".filmkit-hash";

/**
 * @typedef {{ code: string, message: string, selector?: string }} Finding
 * @typedef {{ format: string, dir: string, ok: boolean, errors: Finding[], warnings: Finding[] }} FormatCheck
 */

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  return checkFilm(studio, film, resolveFormats(studio, film, args.slice(1)), log, options.force === true);
}

/**
 * Every format checked, several at a time, each logged as it finishes; the result says which passed, and why not.
 * @param {import("../../studio.js").Studio} studio
 * @param {import("../../studio.js").Film} film
 * @param {string[]} formats
 * @param {import("../index.js").Context["log"]} log
 * @param {boolean} [force] check formats that are unchanged too
 */
export async function checkFilm(studio, film, formats, log, force = false) {
  const checked = await pool(formats, slots(), (format) => checkFormat(studio, film, format, log, force));
  const failed = checked.filter((c) => !c.ok).map((c) => c.format);
  log(failed.length ? `✗ ${film.name}: check failed in ${failed.join(", ")}` : `✓ ${film.name}: ${formats.join(", ")}`);
  return { film: film.name, ok: !failed.length, formats: checked };
}

/**
 * @param {import("../../studio.js").Studio} studio
 * @param {import("../../studio.js").Film} film
 * @param {string} format
 * @param {import("../index.js").Context["log"]} log
 * @param {boolean} force
 * @returns {Promise<FormatCheck>}
 */
async function checkFormat(studio, film, format, log, force) {
  const started = Date.now();
  const hash = formatHash(studio, film, format);
  const dir = buildDir(studio, film, format);
  const passed = force ? null : lastPass(dir);
  /** @type {FormatCheck} */
  let result;
  if (passed?.hash === hash) {
    result = { format, dir, ok: true, errors: [], warnings: passed.warnings };
    log(`${format} unchanged ✓`);
  } else {
    log(`${format} checking`);
    assemble(studio, film, format);
    result = { format, dir, ...findings(await hyperframesAsync(["check", "--json"], { cwd: dir })) };
    if (result.ok) writeFileSync(join(dir, PASSED), JSON.stringify({ hash, warnings: result.warnings }) + "\n");
    log(`${format} ${result.ok ? "✓" : "✗"} ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
  for (const e of result.errors) log(`  ✗ ${e.code}: ${e.message}${e.selector ? ` (${e.selector})` : ""}`);
  for (const w of result.warnings) log(`  ⚠ ${w.code}: ${w.message}${w.selector ? ` (${w.selector})` : ""}`);
  return result;
}

/**
 * The format's last pass, while its build is still what passed.
 * @param {string} dir
 * @returns {{ hash: string, warnings: Finding[] } | null}
 */
export function lastPass(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, PASSED), "utf8"));
  } catch {
    return null;
  }
}

/**
 * The errors and warnings in `hyperframes check --json`'s report, from every pass (lint, runtime, layout, motion,
 * contrast, craft).
 * @param {{ ok: boolean, stdout: string, stderr?: string }} run
 * @returns {{ ok: boolean, errors: Finding[], warnings: Finding[] }}
 */
export function findings({ ok, stdout, stderr = "" }) {
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    // Its stderr is held back while formats run together, so its last line is the only word on what went wrong.
    const why = stderr.trim().split("\n").at(-1);
    return { ok: false, errors: [{ code: "hyperframes", message: `hyperframes check gave no report${why ? `: ${why}` : ""}` }], warnings: [] };
  }
  /** @type {{ severity: string, code: string, message: string, selector?: string }[]} */
  const all = Object.values(report).flatMap((pass) => (Array.isArray(pass?.findings) ? pass.findings : []));
  /** @param {string} severity */
  const of = (severity) => all.filter((f) => f.severity === severity).map(({ code, message, selector }) => ({ code, message, ...(selector && { selector }) }));
  return { ok: ok && report.ok !== false, errors: of("error"), warnings: of("warning") };
}
