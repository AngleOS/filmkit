import { FIRST_FILM } from "../../setup.js";
import { openStudio } from "../../studio.js";
import { next, tour } from "../../tour.js";
import { pear } from "../banner.js";
import { answer, asking as isAsking, p, start } from "../walkthrough.js";

export const usage = "tour [film] [--yes] [--no-render]";
export const summary = "the first film (films/hello unless named) made one command at a time, each explained before it runs: new, check, contact, render; asks before each in a terminal unless --yes";
export const options = { yes: { type: /** @type {const} */ ("boolean"), short: "y" }, "no-render": { type: /** @type {const} */ ("boolean") } };

/** @param {import("../index.js").Context} ctx */
export async function run(ctx) {
  const { args, options, json, log } = ctx;
  const studio = openStudio(/** @type {string | undefined} */ (options.studio));
  const film = args[0] ?? FIRST_FILM.name;
  if (!isAsking(ctx)) {
    const result = await tour(studio, film, { ask: fromFlags(options), open: false }, { log, heading: (t) => log(`▸ ${t}`), json });
    if (result.ok) log(next(studio, film).join("\n"));
    return result;
  }
  const out = await start();
  /** @type {import("../../tour.js").Ask} */
  const ask = async (_, stop) => answer(await p.confirm({ message: `Run ${pear(stop.command)}?` }), "tour");
  const result = await tour(studio, film, { ask, open: true }, { ...out, json });
  if (!result.ok) p.cancel("The tour stopped at the step above: fix it, then run filmkit tour again.");
  else {
    const lines = next(studio, film);
    if (lines.length > 1) out.log(lines.slice(0, -1).join("\n"));
    p.outro(lines.at(-1));
  }
  return result;
}

/**
 * The tour without a person: every step, but the render with --no-render.
 * @param {import("../index.js").Context["options"]} options
 * @returns {import("../../tour.js").Ask}
 */
export const fromFlags = (options) => async (step) => !(options["no-render"] && step === "render");
