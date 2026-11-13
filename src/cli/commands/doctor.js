import { spawnSync } from "node:child_process";
import { HYPERFRAMES, hyperframes } from "../../hyperframes.js";
import { FilmkitError, describe } from "../../errors.js";
import { banner } from "../banner.js";

export const usage = "doctor";
export const summary = "what filmkit needs: Node ≥ 20.12, ffmpeg, the pinned HyperFrames and its Chrome; exits 3 when one is missing";

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
export const requirements = () => [node(), ffmpegVersion(), ...hyperframesAndChrome()];

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

/** @returns {Check} */
function ffmpegVersion() {
  const { status, stdout } = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (status !== 0) return missing("ffmpeg", "not on the PATH", "ffmpeg_missing");
  return { name: "ffmpeg", ok: true, detail: stdout.split("\n")[0].replace(/ Copyright.*/, "").trim() };
}

/**
 * The pin runs through npx, and its own doctor says whether Chrome can render. Its other checks (a newer version,
 * optional speech and music models) don't apply to filmkit.
 * @returns {Check[]}
 */
function hyperframesAndChrome() {
  let report;
  try {
    report = JSON.parse(hyperframes(["doctor", "--json"], { cwd: process.cwd(), capture: true }).stdout);
  } catch (e) {
    return [missing("HyperFrames", `${HYPERFRAMES} didn't run`, e instanceof FilmkitError && e.code ? e.code : "hyperframes_offline")];
  }
  /** @type {Check | undefined} */
  const chrome = report.checks?.find((/** @type {Check} */ c) => c.name === "Chrome");
  return [
    { name: "HyperFrames", ok: true, detail: HYPERFRAMES },
    chrome?.ok ? { ...chrome, name: "Chrome" } : missing("Chrome", chrome?.detail ?? "HyperFrames' doctor didn't report Chrome", "chrome_missing"),
  ];
}
