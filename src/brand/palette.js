// A brand's palette from its accent and a ground: the colours filmkit brand writes over `default` (a dark ground) or
// `paper` (a light one). The grounds and text are tinted with the accent's hue so the frame reads as the brand's, and
// every colour is moved until it passes WCAG AA on each ground it's read on. Text in the accent is held to reading
// text's 4.5:1, not display type's 3:1: a brand's accent sits in captions and buttons as well as titles, and where
// the brand's own colour falls short, the theme takes the nearest that passes and says so.
import { contrast, passing, rgba } from "../contrast.js";

export const GROUNDS = ["dark", "light"];
const READ = 4.5;

/**
 * @typedef {{ key: string, brand: string, used: string, ratio: number }} Adjusted the brand's accent, too faint on its
 *   grounds for text, and the colour `key` takes instead; `ratio` is the brand's on the faintest of them
 * @typedef {{ extends: "default" | "paper", values: Pick<import("../theme.js").ThemeValues, "grounds" | "accent" |
 *   "accentOn" | "text">, adjusted: Adjusted[] }} Palette
 */

/** The ground an accent reads best on: a dark accent on white, a bright one on near-black. @param {string} accent */
export const proposeGround = (accent) => (contrast(accent, "#ffffff") > contrast(accent, "#000000") ? "light" : "dark");

/**
 * @param {string} accent the brand's colour, a hex
 * @param {string} ground "dark" or "light"
 * @returns {Palette}
 */
export function palette(accent, ground) {
  const [h, s] = hsl(accent);
  /** @type {Adjusted[]} */
  const adjusted = [];
  /** The brand's accent, or the nearest colour to it that reads on each of `grounds`. @param {string} key @param {string[]} grounds */
  const accentOn = (key, grounds) => {
    const used = readable(accent, grounds);
    if (used !== accent) adjusted.push({ key, brand: accent, used, ratio: Math.floor(Math.min(...grounds.map((g) => contrast(accent, g))) * 100) / 100 });
    return used;
  };
  if (ground === "light") {
    const [ink, paper] = ["#ffffff", hex(h, Math.min(s, 0.25), 0.95)];
    const text = hex(h, Math.min(s, 0.3), 0.08);
    const onLight = accentOn("accent", [ink, paper]);
    // The second ground, a pale tint of the accent, light enough for the text and the accent to read on it.
    const second = secondGround(h, s, [text, onLight], 0.86, 0.01);
    const muted = readable(hex(h, Math.min(s, 0.1), 0.38), [ink, paper, second]);
    return {
      extends: "paper",
      values: {
        grounds: { ink, "accent-dark": second, jet: paper, paper },
        accent: onLight,
        accentOn: { paper: onLight },
        text: { ink: text, muted, onPaper: text, mutedOnPaper: muted, wordmark: text },
      },
      adjusted,
    };
  }
  const [ink, jet, paper] = [hex(h, Math.min(s, 0.35), 0.06), hex(h, Math.min(s, 0.08), 0.13), "#ffffff"];
  const text = hex(h, Math.min(s, 0.15), 0.94);
  const onDark = accentOn("accent", [ink, jet]);
  // The second ground, a deep shade of the accent, dark enough for the text and the accent to read on it.
  const second = secondGround(h, s, [text, onDark], 0.24, -0.01);
  const muted = readable(hex(h, Math.min(s, 0.12), 0.7), [ink, jet, second]);
  const onPaper = accentOn("accentOn.paper", [paper]);
  return {
    extends: "default",
    values: {
      grounds: { ink, "accent-dark": second, jet, paper },
      accent: onDark,
      accentOn: { paper: onPaper },
      text: { ink: text, muted, onPaper: ink, mutedOnPaper: readable(hex(h, Math.min(s, 0.1), 0.36), [paper]), wordmark: text },
    },
    adjusted,
  };
}

/**
 * The colour nearest `colour` that reads on every one of `grounds`, all dark or all light: each move away from one
 * ground moves it away from the others too.
 * @param {string} colour
 * @param {string[]} grounds
 */
function readable(colour, grounds) {
  return grounds.reduce((c, ground) => (contrast(c, ground) >= READ ? c : passing(c, ground, READ)), colour);
}

/**
 * The accent's hue at the first lightness from `from`, stepping by `step`, on which each of `over` reads.
 * @param {number} h
 * @param {number} s
 * @param {string[]} over
 * @param {number} from
 * @param {number} step
 */
function secondGround(h, s, over, from, step) {
  for (let l = from; l > 0 && l < 1; l += step) {
    const ground = hex(h, Math.min(s, 0.6), l);
    if (over.every((c) => contrast(c, ground) >= READ)) return ground;
  }
  return step < 0 ? "#000000" : "#ffffff";
}

/** @param {string} colour @returns {[h: number, s: number, l: number]} hue in degrees, saturation and lightness 0–1 */
export function hsl(colour) {
  const [r, g, b] = rgba(colour).slice(0, 3).map((c) => c / 255);
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)];
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

/** @param {number} h @param {number} s @param {number} l @returns {string} #rrggbb */
export function hex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((v) => Math.round((v + l - c / 2) * 255).toString(16).padStart(2, "0")).join("")}`;
}
