import { join } from "node:path";
import { assemble } from "../../build/assemble.js";
import { watchSources } from "../../build/watch.js";
import { startHyperframes } from "../../hyperframes.js";
import { RequirementError, openFilm, openStudio, resolveFormats } from "../../studio.js";

export const usage = "preview <film> [format] [--no-open]";
export const summary = "HyperFrames Studio on the film, reloading as you save films/, the theme or the kit; f switches format";
export const options = { open: { type: /** @type {const} */ ("boolean") }, "no-open": { type: /** @type {const} */ ("boolean") } };

// HyperFrames colours its banner; the Studio URL is found in it with the colours taken out.
const ANSI = /\x1b\[[\d;?]*[A-Za-z]/g;
const STUDIO_URL = /Studio\s+(https?:\/\/\S+)/;

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, json, log }) {
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = openFilm(studio, args[0]);
  const [first] = resolveFormats(studio, film, args.slice(1, 2));
  const formats = [first, ...resolveFormats(studio, film).filter((f) => f !== first)];
  // One directory for every format: switching resizes the master in place, so Studio's server and tab stay.
  const dir = join(studio.dir, "build", film.name, "preview");
  assemble(studio, film, first, dir);
  const open = !options["no-open"] && (options.open ?? Boolean(process.stdout.isTTY));

  let shown = 0;
  const hint = () =>
    log(`Showing ${formats[shown]}${formats.length > 1 ? " · press f for the next format" : ""} · q to quit`);
  const live = watchSources(studio, film, dir, first, {
    onChange: (path) => log(`updated ${path}`),
    onError: (path, error) => log(`not updated: ${path} (${error.message})`),
  });
  const server = startHyperframes(["preview", dir, "--foreground", ...(open ? [] : ["--no-open"])], { cwd: dir });

  // The hint follows HyperFrames' banner, once its Studio URL is out and the banner has gone quiet.
  let url = "";
  /** @type {string | null} */
  let banner = "";
  /** @type {NodeJS.Timeout | undefined} */
  let settling;
  server.child.stdout?.on("data", (/** @type {Buffer} */ chunk) => {
    (json ? process.stderr : process.stdout).write(chunk);
    if (banner === null) return;
    banner += chunk;
    url ||= STUDIO_URL.exec(banner.replace(ANSI, ""))?.[1] ?? "";
    if (!url) return;
    clearTimeout(settling);
    settling = setTimeout(() => {
      banner = null;
      hint();
    }, 1000);
  });

  let quitting = false;
  const quit = () => {
    quitting = true;
    server.stop();
  };
  /** @param {Buffer} data */
  const keys = (data) => {
    for (const key of data.toString()) {
      if (key === "q" || key === "\u0003") quit();
      else if (key === "f" && formats.length > 1) {
        const next = (shown + 1) % formats.length;
        try {
          live.show(formats[next]);
          shown = next;
          hint();
        } catch (e) {
          log(`still showing ${formats[shown]}: ${/** @type {Error} */ (e).message}`);
        }
      }
    }
  };
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on("data", keys);
  process.on("SIGINT", quit).on("SIGTERM", quit);

  try {
    const code = await new Promise((resolve, reject) => {
      server.child.on("error", (e) =>
        reject(/** @type {NodeJS.ErrnoException} */ (e).code === "ENOENT" ? new RequirementError("npx not found: install Node ≥ 20 (https://nodejs.org)") : e));
      server.child.on("exit", resolve);
    });
    const ok = quitting || code === 0;
    return { film: film.name, format: formats[shown], ok, dir, url, ...(!ok && { exit: 4 }) };
  } finally {
    live.close();
    process.stdin.off("data", keys);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}
