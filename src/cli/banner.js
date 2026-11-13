// The Angle banner (D-007): the mark and ANGLE FILMKIT in Pear, on --help and doctor only. It's decoration for a
// person at a colour terminal, so it never shows with --json, on a pipe or when NO_COLOR or FORCE_COLOR=0 is set.
// A pipe is checked on its own because agent harnesses set FORCE_COLOR.

/**
 * Pear (#e3ef26) at each colour depth: 24-bit, the nearest of 256, and bright yellow of 16.
 * @type {[depth: number, sgr: string][]}
 */
const PEAR = [[24, "38;2;227;239;38"], [8, "38;5;190"], [4, "93"]];

/**
 * The banner line, or "" where it mustn't show.
 * @param {boolean} json
 * @param {{ isTTY?: boolean, getColorDepth?: (env?: object) => number }} [stream]
 * @param {NodeJS.ProcessEnv} [env]
 */
export function banner(json, stream = process.stdout, env = process.env) {
  if (json || !stream.isTTY || env.NO_COLOR || env.FORCE_COLOR === "0") return "";
  const depth = stream.getColorDepth?.(env) ?? 1;
  const pear = PEAR.find(([least]) => depth >= least)?.[1];
  if (!pear) return "";
  return `\x1b[1;${pear}m╱◣ ANGLE FILMKIT\x1b[0m  \x1b[2mbrand films in HTML\x1b[0m`;
}
