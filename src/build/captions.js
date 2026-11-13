// A film's captions as sidecar subtitles: renders/<film>.srt and .vtt. The `captions` scene's `lines` ("start-end
// text", one per line, in seconds of the scene) are the source of truth, moved by the host's start into the film's
// time. Every format is laid out from the same master with the same timing, so one pair of files serves them all.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fail } from "../errors.js";
import { startTags } from "./html.js";

const SCENE = "kit/scenes/captions.html";
const LINE = /^\s*([\d.]+)\s*-\s*([\d.]+)\s+(.+?)\s*$/;
// "intro", "intro + 0.5" or "intro - 1": after another clip ends, HyperFrames' relative start.
const AFTER = /^([A-Za-z_][\w-]*)(?:\s+([+-])\s+([\d.]+))?$/;

/** @typedef {{ start: number, end: number, text: string }} CaptionLine */

/**
 * Every timed clip's start and duration in the film's seconds, with relative starts resolved.
 * @param {string} html
 * @returns {Record<string, { start: number, duration: number }>}
 */
export function sceneStarts(html) {
  const clips = Object.fromEntries(startTags(html).filter((t) => t.attrs.id && "data-start" in t.attrs).map((t) => [t.attrs.id, t.attrs]));
  /** @typedef {{ start: number, duration: number }} Timing */
  /** @type {Record<string, Timing>} */
  const resolved = {};
  /** @param {string} id @param {string[]} seen @returns {Timing} */
  const resolve = (id, seen) => {
    if (resolved[id]) return resolved[id];
    if (!clips[id]) throw new Error(`"${seen.at(-1)}" starts after "${id}", and there's no clip "${id}"`);
    if (seen.includes(id)) throw new Error(`the start of "${id}" leads back to itself`);
    const after = clips[id]["data-start"].trim().match(AFTER);
    const prior = after && resolve(after[1], [...seen, id]);
    const start = prior ? prior.start + prior.duration + (after[2] === "-" ? -1 : 1) * +(after[3] ?? 0) : +clips[id]["data-start"];
    return (resolved[id] = { start, duration: +(clips[id]["data-duration"] ?? 0) });
  };
  for (const id of Object.keys(clips)) resolve(id, []);
  return resolved;
}

/**
 * The film's caption lines, from every captions host in the master, in order.
 * @param {string} html
 * @returns {CaptionLine[]}
 */
export function captionLines(html) {
  const hosts = startTags(html).filter((t) => t.attrs["data-composition-src"] === SCENE);
  if (!hosts.length) return [];
  const starts = sceneStarts(html);
  return hosts
    .flatMap(({ attrs }) => {
      const offset = starts[attrs.id]?.start ?? 0;
      const lines = String(JSON.parse(attrs["data-variable-values"] || "{}").lines ?? "");
      return lines.split("\n").flatMap((line) => {
        const m = line.match(LINE);
        // U+2060 word joiners keep a burned-in caption from breaking mid-word; a player wraps on its own.
        return m ? [{ start: round(offset + +m[1]), end: round(offset + +m[2]), text: m[3].replaceAll("⁠", "") }] : [];
      });
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/** @param {number} t */
const round = (t) => Math.round(t * 1000) / 1000;

/** @param {number} t @param {string} sep */
function stamp(t, sep) {
  const ms = Math.round(t * 1000);
  const pad = (/** @type {number} */ n, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${sep}${pad(ms % 1000, 3)}`;
}

/** @param {CaptionLine[]} lines */
export const srt = (lines) => lines.map((l, i) => `${i + 1}\n${stamp(l.start, ",")} --> ${stamp(l.end, ",")}\n${l.text}\n`).join("\n");

/** @param {CaptionLine[]} lines */
export const vtt = (lines) => "WEBVTT\n\n" + lines.map((l) => `${stamp(l.start, ".")} --> ${stamp(l.end, ".")}\n${l.text}\n`).join("\n");

/**
 * The film's caption lines; a captions host whose values aren't JSON is a usage error that names the film. (openFilm
 * has checked its starts.)
 * @param {import("../studio.js").Film} film
 */
export function readCaptions(film) {
  try {
    return captionLines(film.html);
  } catch (e) {
    throw fail("captions_json", { film: film.name, error: /** @type {Error} */ (e).message });
  }
}

/**
 * Writes renders/<film>.srt and .vtt, replacing the last ones. A film with no captions gets no files.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {CaptionLine[]} [lines]
 * @returns {{ srt: string | null, vtt: string | null, lines: CaptionLine[] }}
 */
export function writeCaptions(studio, film, lines = readCaptions(film)) {
  const renders = studio.renders;
  const paths = { srt: join(renders, `${film.name}.srt`), vtt: join(renders, `${film.name}.vtt`) };
  for (const path of Object.values(paths)) rmSync(path, { force: true });
  if (!lines.length) return { srt: null, vtt: null, lines };
  mkdirSync(renders, { recursive: true });
  writeFileSync(paths.srt, srt(lines));
  writeFileSync(paths.vtt, vtt(lines));
  return { ...paths, lines };
}
