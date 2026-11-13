// HyperFrames renders every film, run through npx at one pinned version: the pin is what makes a re-render identical.
// Move it only for a fix that matters, then check every example film in every format.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fail } from "./errors.js";

export const HYPERFRAMES = "hyperframes@0.8.186";

// No telemetry, and no command installs skills on its own (newer skills would get ahead of the pin).
Object.assign(process.env, { DO_NOT_TRACK: "1", HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1" });

/**
 * Runs the pinned HyperFrames CLI in `cwd`. Its output streams to the terminal; with `toStderr` it goes to stderr, so
 * stdout stays clean for --json, and with `capture` both are returned instead (its stdout for its own --json, its stderr
 * to say why it failed): its doctor's probes ("docker: command not found") would land in the middle of setup's walkthrough.
 * @param {string[]} args
 * @param {{ cwd: string, toStderr?: boolean, capture?: boolean }} options
 */
export function hyperframes(args, { cwd, toStderr = false, capture = false }) {
  const { status, stdout, stderr, error } = spawnSync("npx", ["--yes", HYPERFRAMES, ...args], {
    cwd,
    stdio: capture ? ["ignore", "pipe", "pipe"] : toStderr ? ["ignore", 2, 2] : "inherit",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (error) throw npxError(error);
  return { ok: status === 0, stdout: stdout ?? "", stderr: stderr ?? "" };
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

/**
 * Fetches the pinned HyperFrames on its own, before several run at once. npx installs a package into one folder, and an
 * npx that starts while another is unpacking there runs the half-unpacked package ("Cannot find module …/dist/…").
 * When it can't be fetched, the runs that follow say so.
 */
export function fetchHyperframes() {
  if (pinnedPackage()) return;
  const { error } = spawnSync("npx", ["--yes", HYPERFRAMES, "--version"], { stdio: "ignore" });
  if (error) throw npxError(error);
}

/** The one-liner's exit when it found the package but no dist/skills in it. */
const NO_SKILLS = 9;

/**
 * The skills the pinned package ships (its dist/skills), written for the CLI that renders. npx puts the package's bin
 * folder on the PATH of what it runs, so a node one-liner run there finds the package beside it, on any platform; it
 * takes the copy at the pinned version, should another hyperframes be on the PATH too.
 */
export function hyperframesSkills() {
  const find = `const { join, delimiter } = require("node:path");
    const { existsSync } = require("node:fs");
    const pkg = process.env.PATH.split(delimiter).map((d) => join(d, "..", "hyperframes"))
      .find((d) => existsSync(join(d, "package.json")) && require(join(d, "package.json")).version === ${JSON.stringify(HYPERFRAMES.split("@")[1])});
    if (!pkg) process.exit(1);
    console.log(join(pkg, "dist", "skills"));
    if (!existsSync(join(pkg, "dist", "skills"))) process.exit(${NO_SKILLS});`;
  const { status, stdout, error } = spawnSync("npx", ["--yes", "-p", HYPERFRAMES, "node", "-e", find], {
    stdio: ["ignore", "pipe", 2],
    encoding: "utf8",
  });
  if (error) throw npxError(error);
  if (status === NO_SKILLS) throw fail("hyperframes_no_skills", { dir: stdout.trim() });
  if (status !== 0) throw fail("hyperframes_offline");
  return stdout.trim();
}

/**
 * Why a run failed, in HyperFrames' own last words: its output is held back while the progress line runs.
 * @param {{ stdout: string, stderr: string }} run
 */
export function lastWords({ stdout, stderr }) {
  /** @param {string} text */
  const said = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("@hf-") && !l.startsWith("█"));
  const words = said(stderr);
  return (words.length ? words : said(stdout)).slice(-3);
}

/** @param {Error} error */
export function npxError(error) {
  const missing = /** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT";
  return missing ? fail("node_missing") : error;
}

/**
 * Starts the pinned HyperFrames CLI in `cwd` and leaves it running, its stdout piped to the caller. It runs in its own
 * process group so that stop() ends HyperFrames itself: npx doesn't pass a signal on to the CLI it started.
 * @param {string[]} args
 * @param {{ cwd: string }} options
 */
export function startHyperframes(args, { cwd }) {
  const group = process.platform !== "win32";
  const child = spawn("npx", ["--yes", HYPERFRAMES, ...args], { cwd, stdio: ["ignore", "pipe", "inherit"], detached: group });
  const stop = () => {
    try {
      if (group && child.pid) process.kill(-child.pid, "SIGTERM");
      else child.kill();
    } catch {
      // it has already exited
    }
  };
  return { child, stop };
}

/**
 * Where npx keeps the pinned HyperFrames package once it has fetched it, or null before then.
 * @param {string} [cache] npm's cache directory
 * @returns {string | null}
 */
export function pinnedPackage(cache = process.env.npm_config_cache ?? defaultCache()) {
  const npx = join(cache, "_npx");
  if (!existsSync(npx)) return null;
  const version = HYPERFRAMES.split("@")[1];
  for (const entry of readdirSync(npx)) {
    const dir = join(npx, entry, "node_modules/hyperframes");
    try {
      if (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version === version) return dir;
    } catch {
      // another package's folder
    }
  }
  return null;
}

const defaultCache = () =>
  process.platform === "win32" ? join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData/Local"), "npm-cache") : join(homedir(), ".npm");
