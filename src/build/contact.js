// A contact sheet: one format's frames tiled into one labelled PNG, the quickest full review of a film (it's how the
// Angle films' overlaps were caught). ffmpeg tiles; the labels are drawn here in a small bitmap font, because many
// ffmpeg builds (Homebrew's among them) come without drawtext.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ffmpeg } from "../ffmpeg.js";
import { SIZES } from "../studio.js";
import { sceneStarts } from "./captions.js";

/** The sheet's longest side, so a reviewer (or a model) can read it whole. */
export const MAX_SIDE = 2048;
/** More frames than this shrink each one past reading. */
export const MAX_FRAMES = 48;
// Kit arrivals take 0.5–0.7 s: 0.7 s after a scene starts, its first elements have landed.
const SETTLED = 0.7;
const GAP = 8;
const SCALE = 3;
const PAD = 6;
const BAND = 7 * SCALE + 2 * PAD;
const GROUND = 0x1b;
const INK = 0xeb;

// 5 × 7 glyphs, a row each, for the labels: "9x16 12.7s".
const GLYPHS = Object.fromEntries(
  Object.entries({
    0: "01110 10001 10011 10101 11001 10001 01110",
    1: "00100 01100 00100 00100 00100 00100 01110",
    2: "01110 10001 00001 00010 00100 01000 11111",
    3: "11111 00010 00100 00010 00001 10001 01110",
    4: "00010 00110 01010 10010 11111 00010 00010",
    5: "11111 10000 11110 00001 00001 10001 01110",
    6: "00110 01000 10000 11110 10001 10001 01110",
    7: "11111 00001 00010 00100 01000 01000 01000",
    8: "01110 10001 10001 01110 10001 10001 01110",
    9: "01110 10001 10001 01111 00001 00010 01100",
    ".": "00000 00000 00000 00000 00000 01100 01100",
    s: "00000 00000 01110 10000 01110 00001 11110",
    x: "00000 00000 10001 01010 00100 01010 10001",
    " ": "00000 00000 00000 00000 00000 00000 00000",
  }).map(([c, rows]) => [c, rows.split(" ")]),
);

/** @param {number} t */
const round = (t) => Math.round(t * 1000) / 1000;

/**
 * The times to look at: `at` as given, else every `every` seconds from 0, else just after each scene starts.
 * @param {import("../studio.js").Film} film
 * @param {{ every?: number, at?: number[] }} when
 */
export function contactTimes(film, { every, at }) {
  const duration = +film.root["data-duration"];
  if (at) return at;
  if (every) return Array.from({ length: Math.ceil(duration / every) }, (_, i) => round(i * every));
  const scenes = Object.values(sceneStarts(film.html)).filter((s) => s.start < duration);
  const times = scenes.map((s) => round(s.start + Math.min(SETTLED, (s.duration || duration - s.start) / 2)));
  return [...new Set(times)].filter((t) => t < duration).sort((a, b) => a - b);
}

/**
 * The grid for `count` frames of a `width` × `height` format: the column count that gives the largest frames with the
 * whole sheet inside MAX_SIDE, each frame under a label band.
 * @param {number} count
 * @param {number} width
 * @param {number} height
 */
export function sheetLayout(count, width, height) {
  let best = { cols: 1, rows: count, w: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const across = Math.floor((MAX_SIDE - GAP * (cols + 1)) / cols);
    const down = Math.floor((((MAX_SIDE - GAP * (rows + 1)) / rows - BAND) * width) / height);
    const w = Math.min(width, across, down);
    if (w > best.w) best = { cols, rows, w };
  }
  const { cols, rows, w } = best;
  const h = Math.floor((w * height) / width);
  const cells = Array.from({ length: count }, (_, i) => {
    const x = GAP + (i % cols) * (w + GAP);
    const y = GAP + Math.floor(i / cols) * (BAND + h + GAP);
    return { x, y, frameY: y + BAND };
  });
  return { width: GAP + cols * (w + GAP), height: GAP + rows * (BAND + h + GAP), frame: { w, h }, cells };
}

/**
 * The sheet's ground with each cell's label drawn in, as a greyscale PGM for ffmpeg.
 * @param {ReturnType<typeof sheetLayout>} layout
 * @param {string[]} labels
 */
export function labelCanvas(layout, labels) {
  const { width, height } = layout;
  const pixels = Buffer.alloc(width * height, GROUND);
  labels.forEach((label, i) => {
    const { x, y } = layout.cells[i];
    // A narrow cell drops the format (the file names it), then cuts from the left: the time is what matters.
    const fits = Math.floor((layout.frame.w - PAD) / (6 * SCALE));
    const text = label.length > fits ? label.split(" ").at(-1)?.slice(-fits) ?? "" : label;
    [...text].forEach((c, n) => {
      GLYPHS[c].forEach((row, gy) => {
        [...row].forEach((bit, gx) => {
          if (bit !== "1") return;
          const left = x + PAD + (n * 6 + gx) * SCALE;
          const top = y + PAD + gy * SCALE;
          for (let dy = 0; dy < SCALE; dy++) pixels.fill(INK, (top + dy) * width + left, (top + dy) * width + left + SCALE);
        });
      });
    });
  });
  return Buffer.concat([Buffer.from(`P5\n${width} ${height}\n255\n`), pixels]);
}

/**
 * Tiles the frames into `out`, each under its label; `dir` holds the label canvas. Returns whether ffmpeg succeeded.
 * @param {{ t: number, path: string }[]} frames
 * @param {string} format
 * @param {string} dir
 * @param {string} out
 */
export function tile(frames, format, dir, out) {
  const [width, height] = SIZES[/** @type {keyof SIZES} */ (format)];
  const layout = sheetLayout(frames.length, width, height);
  const canvas = join(dir, "labels.pgm");
  writeFileSync(canvas, labelCanvas(layout, frames.map((f) => `${format} ${f.t}s`)));
  const { w, h } = layout.frame;
  const graph = [
    "[0:v]format=rgb24[s0]",
    ...frames.map((_, i) => `[${i + 1}:v]scale=${w}:${h}:flags=lanczos,format=rgb24[f${i}]`),
    ...frames.map((_, i) => `[s${i}][f${i}]overlay=${layout.cells[i].x}:${layout.cells[i].frameY}:format=rgb[s${i + 1}]`),
  ].join(";");
  const inputs = [canvas, ...frames.map((f) => f.path)].flatMap((p) => ["-i", p]);
  return ffmpeg([...inputs, "-filter_complex", graph, "-map", `[s${frames.length}]`, "-frames:v", "1", out]);
}
