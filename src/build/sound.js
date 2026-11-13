// A film's sound, made from its picture: films/<film>/sound.json places cues, chords, blooms and pockets in its scenes'
// own time, so a retimed film keeps its sound on the picture. The foley (the vendored sound-sheet renderer) and the
// pad (kit/sound/pad.js) are mixed with the pad `bed` dB under the foley, mastered to −19 LUFS under −1 dBTP, and
// written as build/<film>/sound.m4a, which every format mounts.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pad } from "../../kit/sound/pad.js";
import { ffmpeg, ffmpegLog } from "../ffmpeg.js";
import { describe, fail } from "../errors.js";
import { readJson } from "../json.js";
import { PACKAGE } from "../studio.js";
import { sceneStarts } from "./captions.js";
import { rootTag } from "./html.js";

const SHEET = join(PACKAGE, "kit", "sound", "vendor", "sound-sheet.mjs");
const VERSION = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8")).version;
const PLACED = /** @type {const} */ (["cues", "chords", "blooms", "pockets"]);
/** Integrated loudness and true peak of the delivered sound. */
export const TARGET = { lufs: -19, truePeak: -1 };
/**
 * Where the limiter holds the hits, in dB. AAC overshoots a sharp hit by over a dB, and HyperFrames turns the whole
 * track down when its own AAC lands above −1 dBTP, so the master keeps two dB under that.
 */
const CEILING = -3;

/**
 * @typedef {Record<string, unknown> & { t?: number, at?: number, end?: number, until?: number, scene?: string }} Row
 * @typedef {Record<string, unknown> & { canvas: { w: number, h: number }, fps: number, duration: number, bed?: number,
 *   cues: Row[] } & Required<Pick<import("../../kit/sound/pad.js").PadScore, "chords" | "blooms" | "pockets">>} Score
 * @typedef {{ built: true, path: string, lufs: number, truePeak: number } | { built: false, code: string, error: string, fix: string }} Sound
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
    if (!clips[scene]) throw Object.assign(new Error(`${row.id ? `"${row.id}"` : JSON.stringify(row)} is on scene "${scene}", which index.html doesn't have`), { scene });
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
  if (!sheet.cues.length && !sheet.chords.length) return unbuilt("sound_empty", { film: film.name });
  mkdirSync(work, { recursive: true });
  writeFileSync(files.score, text);
  // `bed` is the pad's level here, but sound-sheet would read it as a drone of its own: the foley stays dry.
  const { bed, ...foleySheet } = sheet;
  writeFileSync(files.sheet, JSON.stringify(foleySheet) + "\n");
  const foley = spawnSync(process.execPath, [SHEET, files.sheet, "--out", files.foley], { stdio: ["ignore", "ignore", 2] });
  if (foley.status !== 0) return unbuilt("sound_failed", { film: film.name, why: "sound-sheet couldn't render the foley" });
  const padWav = pad(sheet);
  if (padWav) writeFileSync(files.pad, padWav);
  const mastering = master(files.foley, padWav && files.pad, bed ?? -12, files.mix);
  if (mastering) return unbuilt("sound_failed", { film: film.name, why: mastering });
  if (!ffmpeg(["-i", files.mix, "-c:a", "aac", "-b:a", "320k", path])) return unbuilt("sound_failed", { film: film.name, why: "ffmpeg couldn't encode sound.m4a" });
  const measured = loudness(path);
  if (!measured) return unbuilt("sound_failed", { film: film.name, why: "ffmpeg couldn't measure sound.m4a" });
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
  const sound = readJson(source, "sound_json", { film: film.name });
  let sheet;
  try {
    sheet = score(film.html, sound);
  } catch (e) {
    if (!(/** @type {{ scene?: string }} */ (e).scene)) throw e;
    throw fail("sound_scene", { film: film.name, problem: /** @type {Error} */ (e).message, clips: Object.keys(sceneStarts(film.html)) });
  }
  if (sheet.bed !== undefined && !Number.isFinite(sheet.bed)) throw fail("sound_bed", { film: film.name, bed: sheet.bed });
  return sheet;
}

/** A sound that didn't build, and why. @param {string} code @param {import("../errors.js").Params} params @returns {Sound} */
function unbuilt(code, params) {
  const { message, fix } = describe(code, params);
  return { built: false, code, error: message, fix };
}

/**
 * Mixes the foley with the bed `gain` dB under it, then masters it: a gain to the target loudness, and a limiter on the
 * hits. Dry hits peak far over the rest, too far for a linear loudnorm, whose fallback squashes the whole mix; the
 * limiter touches only the hits. It runs 4× oversampled, so it holds true peaks rather than samples. What it takes off
 * the hits lowers the loudness a little, so the gain is measured again until it lands. Returns what went wrong, or null.
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
  const level = mixed ? loudness(premix)?.lufs : undefined;
  if (level === undefined) return "ffmpeg couldn't mix the sound";
  let boost = TARGET.lufs - level;
  let lufs;
  for (let pass = 0; pass < 4; pass++) {
    const limited = `volume=${boost.toFixed(2)}dB,aresample=192000,alimiter=limit=${10 ** (CEILING / 20)}:level=false:latency=true:attack=1:release=60,aresample=48000`;
    lufs = ffmpeg(["-i", premix, "-af", limited, "-c:a", "pcm_s24le", out]) ? loudness(out)?.lufs : undefined;
    if (lufs === undefined) return "ffmpeg couldn't master the sound";
    if (Math.abs(lufs - TARGET.lufs) <= 0.1) return null;
    boost += TARGET.lufs - lufs;
  }
  // Only hits, with little between them: the limiter takes off what the gain adds.
  return `the sound reached ${lufs} LUFS, not ${TARGET.lufs}: with its hits held to ${CEILING} dBTP, it needs more sound between them`;
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
