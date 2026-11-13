// The theme's text against each of its grounds, by WCAG AA. A theme sets one text colour, one muted and one accent for
// the dark grounds and another set for paper (the kit's .on-paper), so every ground is checked with the set it gets: a
// Pear word reads on Night and is lost on white. The rendered frames are checked too, by HyperFrames
// (contrast_aa_failure); this catches a theme before it's in a film, on grounds a film's frames may never sample.

/** WCAG AA: reading text 4.5:1. The accent is a title's word, the counter's number, the stat's delta: display type,
 * 48 px and up, where 3:1 is enough. */
const AA = { text: 4.5, muted: 4.5, accent: 3 };

/**
 * @typedef {{ ground: string, role: "text" | "muted" | "accent", key: string, colour: string, on: string, ratio: number,
 *   required: number, suggested: string }} Shortfall `key` is the theme.json key that sets the colour
 */

/**
 * Each pairing of the theme's text with one of its grounds that's under WCAG AA.
 * @param {import("./theme.js").ThemeValues} theme
 * @returns {Shortfall[]}
 */
export function themeContrast({ grounds, accent, accentOn, text }) {
  return Object.entries(grounds).flatMap(([ground, on]) => {
    const paper = ground === "paper";
    /** @type {[Shortfall["role"], string, string][]} */
    const roles = paper
      ? [["text", "text.onPaper", text.onPaper], ["muted", "text.mutedOnPaper", text.mutedOnPaper], ["accent", accentOn?.paper ? "accentOn.paper" : "accent", accentOn?.paper ?? accent]]
      : [["text", "text.ink", text.ink], ["muted", "text.muted", text.muted], ["accent", "accent", accent]];
    return roles.flatMap(([role, key, colour]) => {
      const ratio = contrast(colour, on);
      if (ratio >= AA[role]) return [];
      return [{ ground, role, key, colour, on, ratio: Math.floor(ratio * 100) / 100, required: AA[role], suggested: passing(colour, on, AA[role]) }];
    });
  });
}

/**
 * The WCAG contrast ratio of a colour over a ground; a colour with alpha is seen blended into the ground.
 * @param {string} colour a hex colour
 * @param {string} ground a hex colour, taken as opaque
 */
export function contrast(colour, ground) {
  const under = rgba(ground);
  const [r, g, b, a] = rgba(colour);
  const seen = [r, g, b].map((c, i) => c * a + under[i] * (1 - a));
  const [hi, lo] = [luminance(seen), luminance(under)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The colour nearest `colour` that passes on `ground`: moved towards white on a dark ground, black on a light one.
 * @param {string} colour
 * @param {string} ground
 * @param {number} required
 */
function passing(colour, ground, required) {
  const [r, g, b] = rgba(colour);
  const end = luminance(rgba(ground)) < 0.18 ? 255 : 0;
  for (let step = 1; step <= 100; step++) {
    const hex = `#${[r, g, b].map((c) => Math.round(c + ((end - c) * step) / 100).toString(16).padStart(2, "0")).join("")}`;
    if (contrast(hex, ground) >= required) return hex;
  }
  return end ? "#ffffff" : "#000000";
}

/** @param {string} hex #rgb, #rrggbb or #rrggbbaa @returns {number[]} r, g, b from 0 to 255 and alpha from 0 to 1 */
function rgba(hex) {
  const digits = hex.slice(1).length === 3 ? [...hex.slice(1)].map((d) => d + d).join("") : hex.slice(1);
  const [r, g, b, a = 255] = digits.match(/../g)?.map((d) => parseInt(d, 16)) ?? [];
  return [r, g, b, a / 255];
}

/** WCAG's relative luminance. @param {number[]} rgb from 0 to 255 */
function luminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}
