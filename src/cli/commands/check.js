import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemble, buildDir } from "../../build/assemble.js";
import { formatHash } from "../../build/hash.js";
import { isLoop, measureSeam } from "../../build/seam.js";
import { buildSound } from "../../build/sound.js";
import { describe } from "../../errors.js";
import { hyperframesAsync } from "../../hyperframes.js";
import { pool, slots } from "../../pool.js";
import { progress } from "../../progress.js";
import { openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "check <film> [formats…] [--force]";
export const summary = "build the sound, assemble each format and run `hyperframes check` on it, and a loop's seam gate, skipping formats unchanged since they passed (--force checks all); exits 1 when the sound or any format fails";
export const options = { force: { type: /** @type {const} */ ("boolean") } };

/** Where a format's last pass is kept: the hash of its inputs, and the warnings and seam it passed with. */
const PASSED = ".filmkit-hash";

/**
 * @typedef {{ code: string, message: string, selector?: string }} Finding
 * @typedef {import("../../build/seam.js").SeamCheck} SeamCheck
 * @typedef {{ format: string, dir: string, ok: boolean, errors: Finding[], warnings: Finding[], seam?: SeamCheck }} FormatCheck
 */

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  const live = progress(log);
  try {
    return await checkFilm(studio, film, resolveFormats(studio, film, args.slice(1)), live, options.force === true);
  } finally {
    live.close();
  }
}

/**
 * The film's sound built, then every format checked, several at a time, each logged as it finishes; the result says
 * which passed, and why not.
 * @param {import("../../studio.js").Studio} studio
 * @param {import("../../studio.js").Film} film
 * @param {string[]} formats
 * @param {import("../../progress.js").Progress} live
 * @param {boolean} [force] check formats that are unchanged too
 */
export async function checkFilm(studio, film, formats, live, force = false) {
  // First: every format mounts the sound, and its hash counts it.
  const sound = buildSound(studio, film);
  if (sound) live.log(sound.built ? `♪ ${sound.path}: ${sound.lufs} LUFS, ${sound.truePeak} dBTP` : `✗ sound: ${sound.error}`);
  const checked = await pool(formats, slots(), (format) => checkFormat(studio, film, format, live, force));
  const failed = [...checked.filter((c) => !c.ok).map((c) => c.format), ...(sound && !sound.built ? ["sound"] : [])];
  live.log(failed.length ? `✗ ${film.name}: check failed in ${failed.join(", ")}` : `✓ ${film.name}: ${formats.join(", ")}`);
  return { film: film.name, ok: !failed.length, formats: checked, sound };
}

/** @param {SeamCheck} seam */
function seamLine(seam) {
  if ("error" in seam) return `  ✗ seam: ${seam.error}`;
  const measured = `step ${seam.step}, limit ${seam.limit} (median step at the ends ${seam.median})`;
  return seam.ok ? `  ✓ seam: ${measured}` : `  ✗ seam: the last frame doesn't flow into frame 0: ${measured}`;
}

/**
 * @param {import("../../studio.js").Studio} studio
 * @param {import("../../studio.js").Film} film
 * @param {string} format
 * @param {import("../../progress.js").Progress} live
 * @param {boolean} force
 * @returns {Promise<FormatCheck>}
 */
async function checkFormat(studio, film, format, live, force) {
  const started = Date.now();
  const hash = formatHash(studio, film, format);
  const dir = buildDir(studio, film, format);
  const passed = force ? null : lastPass(dir);
  /** @type {FormatCheck} */
  let result;
  if (passed?.hash === hash) {
    result = { format, dir, ok: true, errors: [], warnings: passed.warnings, ...(passed.seam && { seam: passed.seam }) };
    live.log(`${format} unchanged ✓`);
  } else {
    live.step(format, "checking");
    assemble(studio, film, format);
    result = { format, dir, ...findings(await hyperframesAsync(["check", "--json"], { cwd: dir })) };
    if (isLoop(film.root)) {
      live.step(format, "measuring the seam");
      const out = join(studio.dir, "build", film.name, `seam-${format}`);
      result.seam = await measureSeam(dir, Number(film.root["data-duration"]), out);
      result.ok &&= result.seam.ok;
    }
    if (result.ok) writeFileSync(join(dir, PASSED), JSON.stringify({ hash, warnings: result.warnings, seam: result.seam }) + "\n");
    live.end(format);
    live.log(`${format} ${result.ok ? "✓" : "✗"} ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
  for (const e of result.errors) live.log(`  ✗ ${e.code}: ${e.message}${e.selector ? ` (${e.selector})` : ""}`);
  for (const w of result.warnings) live.log(`  ⚠ ${w.code}: ${w.message}${w.selector ? ` (${w.selector})` : ""}`);
  if (result.seam) live.log(seamLine(result.seam));
  return result;
}

/**
 * The format's last pass, while its build is still what passed.
 * @param {string} dir
 * @returns {{ hash: string, warnings: Finding[], seam?: SeamCheck } | null}
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
    return { ok: false, errors: [{ code: "no_report", message: describe("no_report", { why }).message }], warnings: [] };
  }
  /** @type {{ severity: string, code: string, message: string, selector?: string }[]} */
  const all = Object.values(report).flatMap((pass) => (Array.isArray(pass?.findings) ? pass.findings : []));
  /** @param {string} severity */
  const of = (severity) => all.filter((f) => f.severity === severity).map(({ code, message, selector }) => ({ code, message, ...(selector && { selector }) }));
  return { ok: ok && report.ok !== false, errors: of("error"), warnings: of("warning") };
}
