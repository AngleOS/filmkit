// Live preview keeps a build directory in step with the film's sources: its folder, the kit and the theme. Each
// changed file is copied in on its own, never the whole build again, because HyperFrames Studio watches the build
// directory and reloads the preview on any file in it (0.8.186: a recursive fs.watch, debounced 30–300 ms). Removing
// and recreating the directory would end that watch on macOS.
import { cpSync, existsSync, readFileSync, rmSync, watch } from "node:fs";
import { join } from "node:path";
import { PACKAGE } from "../studio.js";
import { OWN, writeMaster } from "./assemble.js";

/** How long the sources stay quiet before a batch is copied: one save is often several events (write, rename). */
const QUIET_MS = 50;

/** @typedef {{ dir: string, to: string }} Source  a source directory, and where it lands in the build */

/**
 * The film's sources, as assemble() lays them out.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @returns {Source[]}
 */
export const sources = (studio, film) => [
  { dir: film.dir, to: "" },
  { dir: join(PACKAGE, "kit"), to: "kit" },
  ...studio.theme.dirs.map((dir) => ({ dir, to: join("kit", "theme") })),
];

/**
 * Brings one changed path of a source into the build: the master is sized again, sound.json stays out, and anything
 * else is copied, or removed from the build when it's gone from the source.
 * @param {string} out  the build directory
 * @param {string} format  the format the master is sized for
 * @param {Source} source
 * @param {string} name  the changed path, relative to the source
 * @returns {string | null} the path it changed in the build, or null when there was nothing to change
 */
export function syncChange(out, format, source, name) {
  if (source.to === "" && OWN.has(name)) {
    if (name !== "index.html") return null;
    writeMaster(out, readFileSync(join(source.dir, name), "utf8"), format);
    return name;
  }
  const from = join(source.dir, name);
  const to = join(out, source.to, name);
  if (existsSync(from)) cpSync(from, to, { recursive: true });
  else if (existsSync(to)) rmSync(to, { recursive: true });
  else return null; // an editor's temporary file, gone again before the copy
  return join(source.to, name);
}

/**
 * Watches the film's sources and copies each change into `out` once they go quiet, until closed. A change that
 * can't be copied, like a master saved mid-edit without its root, is reported and watching goes on.
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} out  a build directory assemble() wrote
 * @param {string} format
 * @param {{ onChange: (path: string) => void, onError: (path: string, error: Error) => void }} report
 */
export function watchSources(studio, film, out, format, { onChange, onError }) {
  /** @type {Map<string, [Source, string]>} */
  const pending = new Map();
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  const flush = () => {
    for (const [source, name] of pending.values()) {
      try {
        const changed = syncChange(out, format, source, name);
        if (changed) onChange(changed);
      } catch (e) {
        onError(join(source.to, name), /** @type {Error} */ (e));
      }
    }
    pending.clear();
  };
  const watchers = sources(studio, film).map((source) =>
    watch(source.dir, { recursive: true }, (_, name) => {
      if (!name) return;
      pending.set(join(source.dir, name), [source, name]);
      clearTimeout(timer);
      timer = setTimeout(flush, QUIET_MS);
    }).on("error", (e) => onError(source.to || ".", e)),
  );
  return {
    /** Sizes the master for another format; Studio reloads on it like on any save. @param {string} next */
    show(next) {
      writeMaster(out, readFileSync(join(film.dir, "index.html"), "utf8"), next);
      format = next;
    },
    close() {
      clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
    },
  };
}
