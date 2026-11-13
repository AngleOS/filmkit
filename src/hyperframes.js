// HyperFrames renders every film, run through npx at one pinned version: the pin is what makes a re-render identical.
// Move it only for a fix that matters, then check every example film in every format.
import { spawn, spawnSync } from "node:child_process";
import { RequirementError } from "./studio.js";

export const HYPERFRAMES = "hyperframes@0.8.186";

// No telemetry, and no command installs skills on its own (newer skills would get ahead of the pin).
Object.assign(process.env, { DO_NOT_TRACK: "1", HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1" });

/**
 * Runs the pinned HyperFrames CLI in `cwd`. Its output streams to the terminal; with `toStderr` it goes to stderr, so
 * stdout stays clean for --json, and with `capture` its stdout is returned instead (for its own --json).
 * @param {string[]} args
 * @param {{ cwd: string, toStderr?: boolean, capture?: boolean }} options
 */
export function hyperframes(args, { cwd, toStderr = false, capture = false }) {
  const { status, stdout, error } = spawnSync("npx", ["--yes", HYPERFRAMES, ...args], {
    cwd,
    stdio: capture ? ["ignore", "pipe", 2] : toStderr ? ["ignore", 2, 2] : "inherit",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (error) throw npxError(error);
  return { ok: status === 0, stdout: stdout ?? "" };
}

/**
 * Runs the pinned HyperFrames CLI in `cwd` alongside others, with its stdout and stderr captured rather than mixed
 * into the terminal. `onLine` hears each line of its stdout as it comes.
 * @param {string[]} args
 * @param {{ cwd: string, onLine?: (line: string) => void }} options
 * @returns {Promise<{ ok: boolean, stdout: string, stderr: string }>}
 */
export function hyperframesAsync(args, { cwd, onLine }) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", HYPERFRAMES, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      const unheard = stdout.lastIndexOf("\n") + 1;
      stdout += chunk;
      const end = stdout.lastIndexOf("\n");
      if (onLine && end >= unheard) stdout.slice(unheard, end).split("\n").forEach((line) => onLine(line));
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => reject(npxError(error)));
    child.on("close", (status) => resolve({ ok: status === 0, stdout, stderr }));
  });
}

/** @param {Error} error */
function npxError(error) {
  const missing = /** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT";
  return missing ? new RequirementError("npx not found: install Node ≥ 20 (https://nodejs.org)") : error;
}
