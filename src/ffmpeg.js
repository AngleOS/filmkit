// ffmpeg from the PATH, for what HyperFrames doesn't make itself, such as the stills' thumbnail and the seam's frames.
import { spawnSync } from "node:child_process";
import { RequirementError } from "./studio.js";

/**
 * Runs ffmpeg quietly, overwriting its output; its errors go to stderr. Returns whether it succeeded.
 * @param {string[]} args
 */
export function ffmpeg(args) {
  return run(args, 2).ok;
}

/**
 * Runs ffmpeg with `-` as its output and returns what it wrote, or null when it failed. Its errors are held back: it
 * runs inside a check, under the progress lines, which a stray line on the terminal would break.
 * @param {string[]} args
 */
export function ffmpegOutput(args) {
  const { ok, stdout } = run(args, "pipe", "pipe");
  return ok ? stdout : null;
}

/**
 * @param {string[]} args
 * @param {2 | "pipe"} stdout
 * @param {2 | "pipe"} [stderr]
 */
function run(args, stdout, stderr = 2) {
  const result = spawnSync("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args], { stdio: ["ignore", stdout, stderr], maxBuffer: 256 * 1024 * 1024 });
  if (/** @type {NodeJS.ErrnoException | undefined} */ (result.error)?.code === "ENOENT") throw new RequirementError("ffmpeg not on the PATH: install it (https://ffmpeg.org/download.html)");
  if (result.error) throw result.error;
  return { ok: result.status === 0, stdout: result.stdout };
}
