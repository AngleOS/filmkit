// HyperFrames renders every film, run through npx at one pinned version: the pin is what makes a re-render identical.
// Move it only for a fix that matters, then check every example film in every format.
import { spawnSync } from "node:child_process";

export const HYPERFRAMES = "hyperframes@0.8.186";

// No telemetry, and no command installs skills on its own (newer skills would get ahead of the pin).
Object.assign(process.env, { DO_NOT_TRACK: "1", HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1" });

/**
 * Runs the pinned HyperFrames CLI in `cwd` and returns whether it succeeded. Its output streams to the terminal; with
 * `toStderr` it goes to stderr, so stdout stays clean for --json.
 * @param {string[]} args
 * @param {{ cwd: string, toStderr?: boolean }} options
 */
export function hyperframes(args, { cwd, toStderr = false }) {
  const { status, error } = spawnSync("npx", ["--yes", HYPERFRAMES, ...args], {
    cwd,
    stdio: toStderr ? ["ignore", 2, 2] : "inherit",
  });
  if (error) throw error;
  return status === 0;
}
