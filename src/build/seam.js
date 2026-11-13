// The seam gate for a loop: does its last frame flow into frame 0 like any other step? A hook loop plays again from
// frame 0 as soon as it ends, so the step from its last frame back to frame 0 may be at most
// max(0.4, 1.5 × the median of the 8 steps at each end). A step is the mean absolute RGB change between two frames at
// 480 px on the long side, area-scaled: the thresholds come from cinetic's forensics.py --loop and are calibrated at
// that size (skills/filmkit/references/research/launch-video-formats.md). The frames must be lossless: JPEG or video
// frames smooth the noise between neighbours but not across the seam, which then measures ~1.7× its neighbours.
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ffmpegOutput } from "../ffmpeg.js";
import { hyperframesAsync } from "../hyperframes.js";
import { FilmkitError } from "../studio.js";

const FLOOR = 0.4;
const RATIO = 1.5;
const LONG_SIDE = 480;
const FPS = 30;
/** Frames measured at each end. */
const ENDS = 9;

/** @typedef {{ ok: boolean, step: number, median: number, limit: number }} Seam */

/**
 * A root with `data-loop` is a loop, held to the seam gate, unless it says "false".
 * @param {Record<string, string>} root
 */
export const isLoop = (root) => "data-loop" in root && root["data-loop"] !== "false";

/**
 * The mean absolute change between two frames of the same size, as raw RGB bytes.
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 */
export function step(a, b) {
  if (a.length !== b.length) throw new Error(`frames differ in size: ${a.length} and ${b.length} bytes`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/**
 * Measures the seam from the last of `last` to the first of `first`, each a run of raw frames in time order.
 * @param {Uint8Array[]} first
 * @param {Uint8Array[]} last
 * @returns {Seam}
 */
export function gate(first, last) {
  if (first.length < 2 || last.length < 2) throw new Error("need at least two frames at each end");
  /** @param {Uint8Array[]} run */
  const steps = (run) => run.slice(1).map((f, i) => step(run[i], f));
  const median = middle([...steps(first), ...steps(last)]);
  const seam = step(last[last.length - 1], first[0]);
  const limit = Math.max(FLOOR, RATIO * median);
  return { ok: seam <= limit, step: round(seam), median: round(median), limit: round(limit) };
}

/**
 * The times of the first 9 and the last 9 frames of a film `duration` s long. The last is the frame before the end:
 * the frame at the end is frame 0 again, which a loop never shows twice.
 * @param {number} duration
 */
export function seamTimes(duration) {
  const frames = Math.round(duration * FPS);
  if (!(frames >= 2 * ENDS)) throw new FilmkitError(`a loop's root needs a data-duration of at least ${(2 * ENDS) / FPS} s`);
  const at = (/** @type {number} */ k) => (k / FPS).toFixed(6);
  const ends = [...Array(ENDS).keys()];
  return [...ends.map(at), ...ends.map((k) => at(frames - ENDS + k))];
}

/**
 * Snapshots an assembled format's seam frames into `out` and measures them; null when the frames didn't render.
 * @param {string} dir  the format's build directory
 * @param {number} duration
 * @param {string} out
 * @returns {Promise<Seam | null>}
 */
export async function measureSeam(dir, duration, out) {
  rmSync(out, { recursive: true, force: true });
  const at = seamTimes(duration).join(",");
  if (!(await hyperframesAsync(["snapshot", `--at=${at}`, "--no-end", "--describe=false", "-o", out], { cwd: dir })).ok) return null;
  // HyperFrames names each frame for its place and time: frame-03-at-0.1s.png
  const frames = readdirSync(out)
    .map((f) => ({ f, n: f.match(/^frame-(\d+)-at-[\d.]+s\.png$/)?.[1] }))
    .filter(({ n }) => n)
    .sort((a, b) => Number(a.n) - Number(b.n))
    .map(({ f }) => decode(join(out, f)));
  if (frames.length !== 2 * ENDS || frames.some((f) => !f)) return null;
  return gate(/** @type {Buffer[]} */ (frames.slice(0, ENDS)), /** @type {Buffer[]} */ (frames.slice(ENDS)));
}

/**
 * A frame as raw RGB bytes, area-scaled to 480 px on its long side.
 * @param {string} path
 */
function decode(path) {
  const scale = `scale='if(gt(iw,ih),${LONG_SIDE},-2)':'if(gt(iw,ih),-2,${LONG_SIDE})':flags=area`;
  return ffmpegOutput(["-i", path, "-vf", scale, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
}

/** @param {number[]} values */
function middle(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** @param {number} x */
const round = (x) => Math.round(x * 1000) / 1000;
