// filmkit tour (Design §8, D-008): the first film made one command at a time, each explained before it runs, so a
// person learns what their agent will be running. Its steps are the CLI's own commands; `ask` says whether to run
// each one, and tests swap the steps that reach for HyperFrames.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { newFilm, plainName } from "./create.js";
import { STEPS as SETUP, FIRST_FILM } from "./setup.js";

/**
 * @typedef {import("./cli/index.js").Context} Context
 * @typedef {import("./setup.js").StepResult} StepResult
 * @typedef {import("./setup.js").Out} Out
 * @typedef {{ title: string, explain: string[], command: string }} Stop  one step of the tour, as the person sees it
 * @typedef {"new" | "check" | "contact" | "render"} Step
 * @typedef {(step: Step, stop: Stop) => Promise<boolean>} Ask  whether to run the step; no ends the tour there
 * @typedef {{
 *   check: (ctx: Context) => Promise<StepResult>,
 *   contact: (ctx: Context) => Promise<StepResult>,
 *   render: (ctx: Context) => Promise<StepResult>,
 *   open: (path: string) => void,
 * }} Steps
 */

const COMMANDS = new URL("cli/commands/", import.meta.url);
/** @param {string} name */
const command = async (name) => /** @type {import("./cli/index.js").Command} */ (await import(new URL(`${name}.js`, COMMANDS).href));

/** @type {Steps} */
export const STEPS = {
  check: async (ctx) => (await command("check")).run(ctx),
  contact: async (ctx) => (await command("contact")).run(ctx),
  render: async (ctx) => (await command("render")).run(ctx),
  open: SETUP.open,
};

/** @param {string} film @param {boolean} made  whether the tour makes the film, from the statement template */
export const stops = (film, made) => ({
  new: {
    title: "A film",
    explain: [
      `A film is one HTML page, films/${film}/index.html: scenes from the kit on a timeline, with their words,`,
      `in your studio's theme.${made ? " The statement template is the shortest: one line, then the endcard." : ""}`,
    ],
    command: `filmkit new ${film} --template ${FIRST_FILM.template}`,
  },
  check: {
    title: "Check",
    explain: [
      "Check builds the sound and each format (16:9, 1:1, 4:5 and 9:16), then HyperFrames looks at the frames:",
      "text that overflows, overlaps or is too small to read, contrast, and words under a feed's buttons.",
      "Your agent runs it after every change; a format that hasn't changed isn't checked again.",
    ],
    command: `filmkit check ${film}`,
  },
  contact: {
    title: "Contact sheet",
    explain: [
      "A contact sheet is one frame from each scene, side by side: the whole film at a glance, without playing it.",
      "It's how your agent sees what it made.",
    ],
    command: `filmkit contact ${film} 16x9`,
  },
  render: {
    title: "Render",
    explain: [
      `Render makes the MP4s, renders/${film}-<format>.mp4, one per format at delivery quality, with the captions`,
      "as .srt and .vtt to upload beside them. It takes a few minutes.",
    ],
    command: `filmkit render ${film}`,
  },
});

/**
 * Runs the tour's steps on `film` in `studio`, stopping at the first the person declines or that fails; the result has
 * each step's own, null when it didn't run.
 * @param {import("./studio.js").Studio} studio
 * @param {string} film
 * @param {{ ask: Ask, open: boolean }} choices  `open`: show the contact sheet in the browser
 * @param {Out} out
 * @param {Steps} [steps]
 */
export async function tour(studio, film, { ask, open }, { log, heading, json }, steps = STEPS) {
  /** @param {string[]} args @returns {Context} */
  const ctx = (args) => ({ args, options: { studio: studio.dir }, json, log });
  plainName(film);
  const made = !existsSync(join(studio.dir, "films", film));
  const stop = stops(film, made);
  /** @type {Record<string, any>} */
  const result = { ok: true, film, new: null, check: null, contact: null, render: null };
  /** @param {Stop} s */
  const show = (s) => {
    heading(s.title);
    log(s.explain.join("\n"));
  };
  /** @param {Step} name @returns {Record<string, any>} */
  const skip = (name) => {
    log(`· skipped: run ${stop[name].command} when you're ready`);
    return { ...result, stopped: name };
  };

  show(stop.new);
  if (!made) log(`✓ films/${film}, already there: the tour uses it`);
  else if (await ask("new", stop.new)) {
    result.new = { ok: true, ...newFilm(studio, film, FIRST_FILM.template) };
    log(`✓ films/${film} from the ${FIRST_FILM.template} template`);
  } else return skip("new");

  for (const name of /** @type {const} */ (["check", "contact", "render"])) {
    show(stop[name]);
    if (!(await ask(name, stop[name]))) return skip(name);
    const args = name === "contact" ? [film, "16x9"] : [film];
    result[name] = await steps[name](ctx(args));
    if (!result[name].ok) return { ...result, ok: false, exit: result[name].exit ?? 1 };
    const sheet = name === "contact" && result.contact.sheets?.[0]?.path;
    if (sheet && open) steps.open(sheet);
  }
  return result;
}

/**
 * What to do after the tour, with the brand's name in the agent's first ask. The statement template's line is its
 * promise scene; another film's words are in each scene's variables. With no film (a no to the first step), only
 * the way back in.
 * @param {import("./studio.js").Studio} studio
 * @param {string} film
 */
export function next(studio, film) {
  const page = join(studio.dir, "films", film, "index.html");
  if (!existsSync(page)) return [`Run filmkit tour again when you're ready.`];
  return [
    readFileSync(page, "utf8").includes('id="promise"')
      ? `Change the line: it's the promise scene's "text" in films/${film}/index.html.`
      : `Change the words: they're each scene's data-variable-values in films/${film}/index.html.`,
    `Watch the film as you edit it with filmkit preview ${film}.`,
    `Or ask your agent, "Make a 30-second launch film for ${studio.name}". It follows the filmkit skill.`,
  ];
}
