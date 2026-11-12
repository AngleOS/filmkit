import { spawnSync } from "node:child_process";
import { HYPERFRAMES, hyperframes } from "../../hyperframes.js";
import { RequirementError } from "../../studio.js";

export const usage = "doctor";
export const summary = "what filmkit needs: Node ≥ 20, ffmpeg, the pinned HyperFrames and its Chrome; exits 3 when one is missing";

/** @typedef {{ name: string, ok: boolean, detail: string, hint?: string }} Check */

/** @param {import("../index.js").Context} ctx */
export async function run({ log }) {
  const checks = [node(), ffmpegVersion(), ...hyperframesAndChrome()];
  for (const c of checks) log(`${c.ok ? "✓" : "✗"} ${c.name.padEnd(11)} ${c.detail}${c.hint ? `\n    ${c.hint}` : ""}`);
  const ok = checks.every((c) => c.ok);
  return { ok, checks, ...(!ok && { exit: 3 }) };
}

/** @returns {Check} */
function node() {
  const ok = +process.versions.node.split(".")[0] >= 20;
  return { name: "Node.js", ok, detail: process.version, ...(!ok && { hint: "install Node ≥ 20 (https://nodejs.org)" }) };
}

/** @returns {Check} */
function ffmpegVersion() {
  const { status, stdout } = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (status !== 0) return { name: "ffmpeg", ok: false, detail: "not on the PATH", hint: "install it: https://ffmpeg.org/download.html" };
  return { name: "ffmpeg", ok: true, detail: stdout.split("\n")[0].replace(/ Copyright.*/, "") };
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
    const hint = e instanceof RequirementError ? e.message : "npx fetches it on first use: check the network";
    return [{ name: "HyperFrames", ok: false, detail: `${HYPERFRAMES} didn't run`, hint }];
  }
  /** @type {Check | undefined} */
  const chrome = report.checks?.find((/** @type {Check} */ c) => c.name === "Chrome");
  return [
    { name: "HyperFrames", ok: true, detail: HYPERFRAMES },
    chrome ? { ...chrome, name: "Chrome" } : { name: "Chrome", ok: false, detail: "HyperFrames' doctor didn't report Chrome" },
  ];
}
