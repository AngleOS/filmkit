// ffmpeg from the PATH, for what HyperFrames doesn't make itself: the stills' thumbnail, the seam's frames and the
// film's sound.
import { spawnSync } from "node:child_process";
import { RequirementError } from "./studio.js";

/**
 * Runs ffmpeg quietly, overwriting its output; its errors go to stderr. Returns whether it succeeded.
 * @param {string[]} args
 */
export function ffmpeg(args) {
  return run(["-v", "error", "-y", ...args], 2, 2).ok;
}

/**
 * Runs ffmpeg with `-` as its output and returns what it wrote, or null when it failed.
 * @param {string[]} args
 */
export function ffmpegOutput(args) {
  const { ok, stdout } = run(["-v", "error", "-y", ...args], "pipe", 2);
  return ok ? stdout : null;
}

/**
 * Runs ffmpeg for what a filter measures (ebur128), which it logs: returns the log, or null when it failed.
 * @param {string[]} args
 */
export function ffmpegLog(args) {
  const { ok, stderr } = run(["-hide_banner", ...args], "ignore", "pipe");
  return ok ? String(stderr) : null;
}

/**
 * @param {string[]} args
 * @param {2 | "pipe" | "ignore"} stdout
 * @param {2 | "pipe"} stderr
 */
function run(args, stdout, stderr) {
  const result = spawnSync("ffmpeg", ["-nostdin", ...args], { stdio: ["ignore", stdout, stderr], maxBuffer: 256 * 1024 * 1024 });
  if (/** @type {NodeJS.ErrnoException | undefined} */ (result.error)?.code === "ENOENT") throw new RequirementError("ffmpeg not on the PATH: install it (https://ffmpeg.org/download.html)");
  if (result.error) throw result.error;
  return { ok: result.status === 0, stdout: result.stdout, stderr: result.stderr };
}
