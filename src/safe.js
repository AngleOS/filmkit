// The safe box (AL.safe), where words and the key action stay: read from kit/layout.js itself, so check holds a film
// to the box its scenes are laid out in.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { sceneStarts } from "./build/captions.js";
import { PACKAGE, SIZES } from "./studio.js";

const LAYOUT = readFileSync(join(PACKAGE, "kit", "layout.js"), "utf8");
/** How far into a scene its words have arrived and haven't started to leave. */
const SETTLED = 2 / 3;

/**
 * The safe box's margins in a format, in px.
 * @param {string} format
 * @returns {{ top: number, right: number, bottom: number, left: number }}
 */
export function safeBox(format) {
  const [width, height] = SIZES[/** @type {keyof typeof SIZES} */ (format)];
  const root = { dataset: { width, height } };
  /** @type {{ AL?: { safe: ReturnType<typeof safeBox> } }} */
  const window = {};
  runInNewContext(LAYOUT, { window, document: { querySelector: () => root, documentElement: { dataset: {} } } });
  return { .../** @type {NonNullable<typeof window.AL>} */ (window.AL).safe };
}

/**
 * The band under the safe box, as `hyperframes check --caption-zone` takes it: fractions of the frame, and the share of
 * the film it's sampled at, once in each timed scene. HyperFrames measures one band, so it's the foot, where a feed's
 * caption and buttons hide the most.
 * @param {string} html the master
 * @param {number} duration the film's
 * @param {string} format
 */
export function safeZone(html, duration, format) {
  const top = 1 - safeBox(format).bottom / SIZES[/** @type {keyof typeof SIZES} */ (format)][1];
  const scenes = Object.values(sceneStarts(html)).filter((s) => s.duration > 0);
  const settled = (scenes.length ? scenes : [{ start: 0, duration }]).map((s) => Math.round(((s.start + s.duration * SETTLED) / duration) * 1e4) / 1e4);
  return `x0=0;y0=${top};x1=1;y1=1;seek=${[...new Set(settled)].filter((f) => f <= 1).sort((a, b) => a - b).join(",")}`;
}
