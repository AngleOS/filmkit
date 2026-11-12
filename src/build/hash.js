// One hash of everything a format is made from: its sources' paths and contents, the format, the HyperFrames pin and
// filmkit's version. `check` skips a format whose hash still matches its last pass, and `render` keeps an MP4 made
// from the same hash. Contents count, not mtimes, so a fresh checkout or a copied studio still matches.
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { HYPERFRAMES } from "../hyperframes.js";
import { PACKAGE } from "../studio.js";
import { sources } from "./assemble.js";

const VERSION = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8")).version;

/**
 * @param {import("../studio.js").Studio} studio
 * @param {import("../studio.js").Film} film
 * @param {string} format
 */
export function formatHash(studio, film, format) {
  const hash = createHash("sha256").update(`${format}\0${HYPERFRAMES}\0filmkit@${VERSION}\0`);
  // A source itself may be a link (a film folder kept elsewhere): its contents count, as assemble copies them.
  for (const [name, path] of Object.entries(sources(studio, film))) add(hash, name, realpathSync(path));
  return hash.digest("hex");
}

/**
 * Adds a file, or a folder's files in a stable order, each under its path so a rename counts as a change. A symlink
 * counts by where it points, so a broken one doesn't stop the check and one to a parent folder doesn't recurse.
 * @param {import("node:crypto").Hash} hash
 * @param {string} name
 * @param {string} path
 */
function add(hash, name, path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    hash.update(`${name}\0->${readlinkSync(path)}\0`);
    return;
  }
  if (!stat.isDirectory()) {
    const bytes = readFileSync(path);
    hash.update(`${name}\0${bytes.length}\0`).update(bytes);
    return;
  }
  for (const entry of readdirSync(path).sort()) add(hash, `${name}/${entry}`, join(path, entry));
}
