// The still `filmkit brand` shows for a yes or no: the poster template in the new brand, its mark assembled over the
// motif under a line with the accent, so the logo, the colours and the type are all in one frame.
import { copyFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { assemble } from "../build/assemble.js";
import { templateFilm } from "../create.js";
import { hyperframes } from "../hyperframes.js";
import { openStudio } from "../studio.js";

/** A name no film takes: the build is build/brand-still/, beside the films'. */
const FILM = "brand-still";
/** The poster's mark has settled by then. */
const AT = 1.8;

/** The still's film, built in 16:9: its directory. @param {string} root */
export function buildStill(root) {
  const studio = openStudio(root);
  return assemble(studio, templateFilm(studio, FILM, "poster"), "16x9");
}

/** The still as a PNG, build/brand-still/still.png, or undefined when HyperFrames couldn't take it. @param {string} root */
export function brandStill(root) {
  const dir = buildStill(root);
  const out = join(dir, "..", "snap");
  rmSync(out, { recursive: true, force: true });
  // Captured, not streamed: the walkthrough's prompts are on the terminal.
  const { ok } = hyperframes(["snapshot", `--at=${AT}`, "--no-end", "--describe=false", "-o", out], { cwd: dir, capture: true });
  const frame = ok ? readdirSync(out).find((f) => f.endsWith(".png")) : undefined;
  if (!frame) return undefined;
  const still = join(dir, "..", "still.png");
  copyFileSync(join(out, frame), still);
  return still;
}
