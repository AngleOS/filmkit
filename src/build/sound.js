// A film's sound, made from its picture: films/<film>/sound.json places cues, chords, blooms and pockets in its scenes'
// own time, so a retimed film keeps its sound on the picture. The foley (the vendored sound-sheet renderer) and the
// pad (kit/sound/pad.js) are mixed with the pad `bed` dB under the foley, mastered to −19 LUFS and −1 dBTP, and
// written as build/<film>/sound.m4a, which every format mounts.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pad } from "../../kit/sound/pad.js";
import { ffmpeg, ffmpegLog } from "../ffmpeg.js";
import { FilmkitError, PACKAGE } from "../studio.js";
import { sceneStarts } from "./captions.js";
import { rootTag } from "./html.js";

const SHEET = join(PACKAGE, "kit", "sound", "vendor", "sound-sheet.mjs");
const VERSION = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8")).version;
const PLACED = /** @type {const} */ (["cues", "chords", "blooms", "pockets"]);
/** Integrated loudness, true peak and loudness range: where loudnorm masters to. */
export const TARGET = { lufs: -19, truePeak: -1, range: 14 };
const LOUDNORM = `loudnorm=I=${TARGET.lufs}:TP=${TARGET.truePeak}:LRA=${TARGET.range}`;

/**
 * @typedef {Record<string, unknown> & { t?: number, at?: number, end?: number, until?: number, scene?: string }} Row
 * @typedef {Record<string, unknown> & { canvas: { w: number, h: number }, fps: number, duration: number, bed?: number,
 *   cues: Row[] } & Required<Pick<import("../../kit/sound/pad.js").PadScore, "chords" | "blooms" | "pockets">>} Score
 * @typedef {{ built: true, path: string, lufs: number, truePeak: number } | { built: false, error: string }} Sound
 */

/**
 * The score: sound.json with every row at absolute times ("scene" and "at" or "until" become "t" and "end"), sorted,
 * plus the master's canvas, frame rate and length. Rows without a scene keep their own "t" and "end".
 * @param {string} html the master
 * @param {Record<string, unknown>} sound sound.json
 * @returns {Score}
 */
export function score(html, sound) {
  const root = rootTag(html).attrs;
  const clips = sceneStarts(html);
  /** @param {Row} row */
  const place = ({ scene, at = 0, until, ...row }) => {
    if (scene === undefined) return row;
    if (!clips[scene]) throw new Error(`${row.id ?? JSON.stringify(row)}: no scene "${scene}" in index.html`);
    const start = clips[scene].start;
    return { ...row, t: round(start + at), ...(until !== undefined && { end: round(start + until) }) };
  };
  const placed = Object.fromEntries(PLACED.map((key) => {
    const rows = /** @type {Row[]} */ (sound[key] ?? []);
    return [key, rows.map(place).sort((a, b) => /** @type {number} */ (a.t) - /** @type {number} */ (b.t))];
  }));
  const rest = Object.fromEntries(Object.entries(sound).filter(([key]) => !(/** @type {readonly string[]} */ (PLACED)).includes(key)));
  const canvas = { w: +root["data-width"], h: +root["data-height"] };
  return /** @type {Score} */ ({ ...rest, canvas, fps: +(root["data-fps"] ?? 30), duration: +root["data-duration"], ...placed });
}

/** @param {number} t */
const round = (t) => Math.round(t * 1000) / 1000;

/**
 * Builds build/<film>/sound.m4a from films/<film>/sound.json, replacing the last one; null when the film has no
 * sound.json. A sound.json that doesn't read is a usage error; a step that fails makes the sound unbuilt.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @returns {Sound | null}
 */
export function buildSound(studio, film) {
  const path = soundPath(studio, film);
  const work = join(studio.dir, "build", film.name, "sound");
  const files = {
    score: join(work, "score.json"), sheet: join(work, "foley.json"), foley: join(work, "foley.wav"), pad: join(work, "pad.wav"), mix: join(work, "mix.wav"),
  };
  const source = join(film.dir, "sound.json");
  const sheet = existsSync(source) ? readScore(film, source) : null;
  // The pad takes about as long as the film to render, and most checks only change the picture: the same score from
  // the same filmkit makes the same sound, so it is kept.
  const text = sheet && JSON.stringify({ ...sheet, filmkit: VERSION }, null, 1) + "\n";
  const kept = text && existsSync(path) && existsSync(files.score) && readFileSync(files.score, "utf8") === text && loudness(path);
  if (kept) return { built: true, path, ...kept };

  rmSync(path, { force: true });
  rmSync(work, { recursive: true, force: true });
  if (!sheet || !text) return null;
  if (!sheet.cues.length && !sheet.chords.length) return { built: false, error: "sound.json places no cues or chords, so there's nothing to hear" };
  mkdirSync(work, { recursive: true });
  writeFileSync(files.score, text);
  // `bed` is the pad's level here, but sound-sheet would read it as a drone of its own: the foley stays dry.
  const { bed, ...foleySheet } = sheet;
  writeFileSync(files.sheet, JSON.stringify(foleySheet) + "\n");
  const foley = spawnSync(process.execPath, [SHEET, files.sheet, "--out", files.foley], { stdio: ["ignore", "ignore", 2] });
  if (foley.status !== 0) return { built: false, error: "sound-sheet couldn't render the foley" };
  const padWav = pad(sheet);
  if (padWav) writeFileSync(files.pad, padWav);
  if (!master(files.foley, padWav && files.pad, bed ?? -12, files.mix)) return { built: false, error: "ffmpeg couldn't mix and master the sound" };
  if (!ffmpeg(["-i", files.mix, "-c:a", "aac", "-b:a", "320k", path])) return { built: false, error: "ffmpeg couldn't encode sound.m4a" };
  const measured = loudness(path);
  if (!measured) return { built: false, error: "ffmpeg couldn't measure sound.m4a" };
  return { built: true, path, ...measured };
}

/**
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 */
export const soundPath = (studio, film) => join(studio.dir, "build", film.name, "sound.m4a");

/**
 * @param {import("../studio.js").Film} film
 * @param {string} source
 */
function readScore(film, source) {
  let sheet;
  try {
    sheet = score(film.html, JSON.parse(readFileSync(source, "utf8")));
  } catch (e) {
    throw new FilmkitError(`films/${film.name}/sound.json: ${/** @type {Error} */ (e).message}`);
  }
  if (sheet.bed !== undefined && !Number.isFinite(sheet.bed)) {
    throw new FilmkitError(`films/${film.name}/sound.json: "bed" is the pad's level under the foley in dB, a number`);
  }
  return sheet;
}

/**
 * Mixes the foley with the bed `gain` dB under it, then masters it in two loudnorm passes: the first measures, the
 * second applies the measurement linearly, so the mix keeps its dynamics. Returns whether it succeeded.
 * @param {string} foley
 * @param {string | null} bed
 * @param {number} gain
 * @param {string} out
 */
function master(foley, bed, gain, out) {
  const premix = out.replace(/\.wav$/, "-premix.wav");
  const mixed = bed
    ? ffmpeg(["-i", foley, "-i", bed, "-filter_complex", `[1:a]volume=${gain}dB[b];[0:a][b]amix=inputs=2:normalize=0:duration=first[m]`, "-map", "[m]", "-c:a", "pcm_s24le", premix])
    : ffmpeg(["-i", foley, "-c:a", "pcm_s24le", premix]);
  const log = mixed && ffmpegLog(["-i", premix, "-af", `${LOUDNORM}:print_format=json`, "-f", "null", "-"]);
  const json = log && log.match(/\{[^{}]*"input_i"[^{}]*\}/)?.[0];
  if (!json) return false;
  const m = JSON.parse(json);
  const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
  return ffmpeg(["-i", premix, "-af", `${LOUDNORM}:${measured}:linear=true`, "-ar", "48000", "-c:a", "pcm_s24le", out]);
}

/**
 * Integrated loudness (LUFS) and true peak (dBTP) by EBU R128, or null when ffmpeg couldn't read the file.
 * @param {string} file
 * @returns {{ lufs: number, truePeak: number } | null}
 */
export function loudness(file) {
  const summary = ffmpegLog(["-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"])?.split("Summary:").pop();
  const lufs = summary?.match(/\bI:\s+(-?[\d.]+) LUFS/)?.[1];
  const truePeak = summary?.match(/\bPeak:\s+(-?[\d.]+) dBFS/)?.[1];
  return lufs && truePeak ? { lufs: +lufs, truePeak: +truePeak } : null;
}
