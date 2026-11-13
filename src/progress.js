// Nothing goes silent for long (kb/Experience.md § Progress and speed). In a terminal each running format has one
// line on stderr, redrawn every second, and at once when its step changes but not on every frame a render reports:
// its step, its frames, the time so far and, once the frame rate is known, the time left. Anywhere else (a pipe, a CI
// log, an agent's shell) a redrawn line is noise, so each step prints one line through the command's log instead.

/**
 * @typedef {{ code: string, done?: number, total?: number }} Stage  a stage of a HyperFrames render, as it reports it
 * @typedef {{ step: string, started: number, stepStarted: number, done?: number, total?: number }} Row
 * @typedef {ReturnType<typeof progress>} Progress
 */

const BAR = 8;
/** Below this a frame rate is a guess. */
const SETTLED_MS = 2000;

/**
 * @param {(...lines: unknown[]) => void} log  where lasting lines go: results, findings, paths
 * @param {{ stream?: { isTTY?: boolean, columns?: number, write: (s: string) => unknown }, now?: () => number }} [options]
 */
export function progress(log, { stream = process.stderr, now = Date.now } = {}) {
  const tty = stream.isTTY === true;
  /** @type {Map<string, Row>} */
  const rows = new Map();
  let drawn = 0;
  /** @type {NodeJS.Timeout | undefined} */
  let ticking;

  const erase = () => {
    if (drawn) stream.write(`\r\x1b[${drawn}A\x1b[J`);
    drawn = 0;
  };
  const draw = () => {
    erase();
    const width = (stream.columns || 80) - 1;
    const lines = [...rows].map(([name, row]) => line(name, row, now()).slice(0, width));
    if (lines.length) stream.write(lines.join("\n") + "\n");
    drawn = lines.length;
  };

  return {
    /**
     * `name` is on to `step`, `frames` into it.
     * @param {string} name
     * @param {string} step
     * @param {{ done?: number, total?: number }} [frames]
     */
    step(name, step, { done, total } = {}) {
      const at = now();
      const row = rows.get(name);
      const moved = row?.step !== step;
      rows.set(name, { step, started: row?.started ?? at, stepStarted: moved ? at : /** @type {Row} */ (row).stepStarted, done, total });
      if (!tty) {
        if (moved) log(`${name} ${step}${total ? ` ${total} frames` : ""}`);
        return;
      }
      ticking ??= setInterval(draw, 1000).unref();
      if (moved) draw();
    },
    /** @param {string} name */
    end(name) {
      rows.delete(name);
      if (tty) draw();
    },
    /** Prints lasting lines above the running ones. @param {...unknown} lines */
    log(...lines) {
      if (tty) erase();
      log(...lines);
      if (tty) draw();
    },
    close() {
      clearInterval(ticking);
      ticking = undefined;
      rows.clear();
      if (tty) erase();
    },
  };
}

/**
 * A running format's line: `16x9  capturing  ▓▓▓░░░░░  frame 612/1440  0:52  1:10 left`.
 * @param {string} name
 * @param {Row} row
 * @param {number} at
 */
export function line(name, { step, started, stepStarted, done = 0, total }, at) {
  const parts = [name, step];
  if (total) {
    const filled = Math.min(BAR, Math.floor((done / total) * BAR));
    parts.push("▓".repeat(filled) + "░".repeat(BAR - filled), `frame ${done}/${total}`);
  }
  parts.push(clock(at - started));
  const spent = at - stepStarted;
  if (total && done && spent >= SETTLED_MS) parts.push(`${clock(((total - done) * spent) / done)} left`);
  return parts.join("  ");
}

/** HyperFrames' render stages, in words. */
const STAGES = /** @type {Record<string, string>} */ ({ compile: "compiling", capture: "capturing", encode: "encoding", assemble: "assembling" });

/**
 * What a HyperFrames render reports on a stdout that isn't a terminal: `@hf-progress {"code":"capture","done":195,…}`.
 * @param {string} text  a line of its stdout
 * @returns {{ step: string, done?: number, total?: number } | null}
 */
export function renderStage(text) {
  const json = text.match(/^@hf-progress (\{.*\})\s*$/)?.[1];
  if (!json) return null;
  try {
    /** @type {Stage} */
    const { code, done, total } = JSON.parse(json);
    // Assembly counts seconds of film, not frames.
    return { step: STAGES[code] ?? code, ...(code !== "assemble" && { done, total }) };
  } catch {
    return null;
  }
}

/** @param {number} ms */
function clock(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
