// HyperFrames' check findings in Filmkit's words (kb/Experience.md § Copy and tone): the format and the time, the
// element by its text, what it collides with, and the snapshot command that shows it. The rules a film often breaks
// have catalogue entries; any other code keeps HyperFrames' own message and fix hint, which say it best.
import { isAbsolute, relative } from "node:path";
import { CATALOGUE, describe, snapshot } from "./errors.js";

/**
 * @typedef {{ code: string, message: string, selector?: string, time?: number, fix?: string }} Finding
 * @typedef {Record<string, any>} Raw a finding in `hyperframes check --json`
 * @typedef {{ film: string, format: string, dir: string, root: string | null, duration: number }} Where
 *   the format's build directory, and the root composition's selector, which is the frame itself
 */

/** The selector HyperFrames gives a finding about the whole film rather than one element. */
const WHOLE = "[data-composition-id]";
/** Labels longer than this are cut at a word, so a paragraph doesn't fill the line. */
const LONG = 40;

/** @param {number} n */
const round = (n) => Math.round(n * 100) / 100;

/** @param {string} text */
function quote(text) {
  const line = text.replace(/\s+/g, " ").trim();
  return `"${line.length > LONG ? `${line.slice(0, LONG).replace(/\s+\S*$/, "")}…` : line}"`;
}

/**
 * Every finding of one format's report, in Filmkit's words.
 * @param {Raw[]} raws
 * @param {Where} where
 * @returns {Finding[]}
 */
export function translate(raws, where) {
  // A collider is named by its text when another finding gives it.
  const texts = new Map(raws.filter((r) => r.selector && r.text).map((r) => [r.selector, r.text]));
  /** @param {string} selector */
  const name = (selector) => {
    if (selector === where.root) return "the frame";
    return texts.has(selector) ? `${quote(texts.get(selector))} (${selector})` : selector;
  };
  return raws.map((raw) => {
    const time = typeof raw.time === "number" ? round(raw.time) : undefined;
    const selector = raw.selector && raw.selector !== WHOLE ? raw.selector : undefined;
    const label = selector && name(selector);
    const base = { code: raw.code, ...(selector && { selector }), ...(time !== undefined && { time }) };
    if (CATALOGUE[raw.code] && time !== undefined) {
      const { message, fix } = describe(raw.code, { ...where, ...params(raw), time, label, other: name(raw.containerSelector) });
      return { ...base, message, fix };
    }
    return { ...base, ...ownWords(raw, where, time, label) };
  });
}

/**
 * What a catalogue entry needs from the finding beyond its place and time.
 * @param {Raw} raw
 */
function params(raw) {
  const over = Math.max(0, ...Object.values(raw.overflow ?? {}));
  return {
    by: over ? ` by ${Math.round(over)} px` : "",
    ratio: raw.ratio,
    required: raw.requiredRatio,
    suggested: raw.suggestedColor,
    seconds: round(raw.seconds ?? 0),
    floor: raw.floorPx ?? round(raw.floorSeconds ?? 0),
    px: raw.fontPx,
  };
}

/**
 * A finding without a catalogue entry: HyperFrames' message and fix hint, with where it is. Its pointer to a
 * HyperFrames skill file goes: a Filmkit user has `filmkit explain` instead.
 * @param {Raw} raw
 * @param {Where} where
 * @param {number | undefined} time
 * @param {string | undefined} label
 */
function ownWords(raw, { film, format, dir }, time, label) {
  const subject = label ?? file(raw, film, dir);
  const said = [String(raw.message).replace(/;? see references\/[\w./-]+\.?$/, "").replace(/([^.])$/, "$1."), raw.fixHint].filter(Boolean).join(" ");
  const head = `${format}${time !== undefined ? ` at ${time} s` : ""}: ${subject ? `${subject}: ` : ""}${said}`;
  if (time === undefined) return { message: head, ...(raw.fixHint && { fix: raw.fixHint }) };
  const show = snapshot({ film, format, time });
  return { message: `${head} See it with: ${show}`, fix: show };
}

/**
 * The film's own file a finding is in (the build mirrors films/<film>/, with the kit in kit/), and its line.
 * @param {Raw} raw
 * @param {string} film
 * @param {string} dir
 */
function file(raw, film, dir) {
  const path = raw.file ?? raw.sourceFile;
  if (!path) return undefined;
  const inBuild = isAbsolute(path) ? relative(dir, path) : path;
  const own = inBuild.startsWith("kit/") ? inBuild : `films/${film}/${inBuild}`;
  return raw.line ? `${own}:${raw.line}` : own;
}
