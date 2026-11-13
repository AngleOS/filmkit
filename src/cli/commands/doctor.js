import { spawnSync } from "node:child_process";
import { HYPERFRAMES, hyperframes, lastWords } from "../../hyperframes.js";
import { FilmkitError, describe } from "../../errors.js";
import { banner } from "../banner.js";

export const usage = "doctor";
export const summary = "what filmkit needs: Node ≥ 20.12, ffmpeg and ffprobe, the pinned HyperFrames and its Chrome; exits 3 when one is missing";

/** @typedef {{ name: string, ok: boolean, detail: string, code?: string, hint?: string }} Check */

/**
 * A failed check, its hint the next step from the error catalogue.
 * @param {string} name @param {string} detail @param {string} code @param {Record<string, string>} [params]
 * @returns {Check}
 */
const missing = (name, detail, code, params) => ({ name, ok: false, detail, code, hint: describe(code, params).next });

/** @param {import("../index.js").Context} ctx */
export async function run({ log, json }) {
  // banner() checks stdout, which is where log writes when json is false.
  const top = banner(json);
  if (top) log(`${top}\n`);
  const checks = requirements();
  for (const c of checks) log(`${c.ok ? "✓" : "✗"} ${c.name.padEnd(11)} ${c.detail}${c.hint ? `\n    ${c.hint}` : ""}`);
  const ok = checks.every((c) => c.ok);
  return { ok, checks, ...(!ok && { exit: 3 }) };
}

/** Each requirement, checked. setup runs these too. */
export const requirements = () => [node(), onPath("ffmpeg", "ffmpeg_missing"), onPath("ffprobe", "ffprobe_missing"), ...hyperframesAndChrome()];

/**
 * Node 20.12 or newer: setup's prompts use its util.styleText.
 * @param {string} [version] as process.versions.node has it
 */
export function nodeSupported(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  return major > 20 || (major === 20 && minor >= 12);
}

/** @returns {Check} */
function node() {
  if (!nodeSupported()) return missing("Node.js", process.version, "node_old", { version: process.version });
  return { name: "Node.js", ok: true, detail: process.version };
}

/**
 * ffmpeg or ffprobe, by its version line. HyperFrames' render reads each film's media with ffprobe: Homebrew's ffmpeg
 * brings both, but a PATH with ffmpeg alone would pass doctor and setup, then fail at the render.
 * @param {string} tool @param {string} code
 * @returns {Check}
 */
function onPath(tool, code) {
  const { status, stdout } = spawnSync(tool, ["-version"], { encoding: "utf8" });
  if (status !== 0) return missing(tool, "not on the PATH", code);
  return { name: tool, ok: true, detail: stdout.split("\n")[0].replace(/ Copyright.*/, "").trim() };
}

/**
 * The pin runs through npx, and its own doctor says whether Chrome can render. Its other checks (a newer version,
 * optional speech and music models) don't apply to filmkit.
 * @returns {Check[]}
 */
function hyperframesAndChrome() {
  let run;
  try {
    run = hyperframes(["doctor", "--json"], { cwd: process.cwd(), capture: true });
  } catch (e) {
    return [missing("HyperFrames", `${HYPERFRAMES} didn't run`, e instanceof FilmkitError && e.code ? e.code : "hyperframes_offline")];
  }
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    // npx's own words say why: offline, a registry error, a cache it can't write.
    const said = lastWords(run).join(" ");
    return [missing("HyperFrames", `${HYPERFRAMES} didn't run${said ? `: ${said}` : ""}`, "hyperframes_offline")];
  }
  /** @type {Check | undefined} */
  const chrome = report.checks?.find((/** @type {Check} */ c) => c.name === "Chrome");
  return [
    { name: "HyperFrames", ok: true, detail: HYPERFRAMES },
    chrome?.ok
      ? { name: "Chrome", ok: true, detail: chromeDetail(chrome.detail) }
      : missing("Chrome", chrome?.detail ?? "HyperFrames' doctor didn't report Chrome", "chrome_missing"),
  ];
}

/**
 * Chrome in a line: HyperFrames' doctor gives the whole path into its cache, and the version says as much.
 * @param {string} detail  as HyperFrames' doctor has it: `cache: $HOME/.cache/hyperframes/chrome/…/chrome-headless-shell`
 */
export function chromeDetail(detail) {
  const version = detail.match(/\d+(?:\.\d+){3}/)?.[0];
  return detail.startsWith("cache:") && version ? `headless shell ${version}, in HyperFrames' cache` : detail;
}
