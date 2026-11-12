// ffmpeg from the PATH, for what HyperFrames doesn't make itself, such as the stills' thumbnail.
import { spawnSync } from "node:child_process";
import { fail } from "./errors.js";

/**
 * Runs ffmpeg quietly, overwriting its output; its errors go to stderr. Returns whether it succeeded.
 * @param {string[]} args
 */
export function ffmpeg(args) {
  const { status, error } = spawnSync("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args], { stdio: ["ignore", 2, 2] });
  if (/** @type {NodeJS.ErrnoException | undefined} */ (error)?.code === "ENOENT") throw fail("ffmpeg_missing");
  if (error) throw error;
  return status === 0;
}
