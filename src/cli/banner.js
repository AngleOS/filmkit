// The Angle banner (D-007): the mark and ANGLE FILMKIT in Pear, on --help, doctor and the walkthroughs, which accent
// their steps in Pear too. It's decoration for a person at a colour terminal, so it never shows with --json, on a pipe
// or when NO_COLOR or FORCE_COLOR=0 is set. A pipe is checked on its own because agent harnesses set FORCE_COLOR.

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
  const sgr = pearSgr(json, stream, env);
  return sgr ? `\x1b[1;${sgr}m╱◣ ANGLE FILMKIT\x1b[0m  \x1b[2mbrand films in HTML\x1b[0m` : "";
}

/**
 * `text` in Pear, where the banner would show; as it is elsewhere. The walkthroughs mark their steps' titles and the
 * commands they run with it.
 * @param {string} text
 * @param {{ isTTY?: boolean, getColorDepth?: (env?: object) => number }} [stream]
 * @param {NodeJS.ProcessEnv} [env]
 */
export function pear(text, stream = process.stdout, env = process.env) {
  const sgr = pearSgr(false, stream, env);
  return sgr ? `\x1b[${sgr}m${text}\x1b[39m` : text;
}

/**
 * Pear's SGR at the stream's colour depth, or "" where colour mustn't show.
 * @param {boolean} json
 * @param {{ isTTY?: boolean, getColorDepth?: (env?: object) => number }} stream
 * @param {NodeJS.ProcessEnv} env
 */
function pearSgr(json, stream, env) {
  if (json || !stream.isTTY || env.NO_COLOR || env.FORCE_COLOR === "0") return "";
  const depth = stream.getColorDepth?.(env) ?? 1;
  return PEAR.find(([least]) => depth >= least)?.[1] ?? "";
}
