// Every failure Filmkit reports, in one catalogue, so each says the same things the same way (kb/Experience.md § Copy
// and tone): the thing, what's wrong, and the fix, as a command where there is one. `filmkit explain <code>` prints an
// entry's `why`, and each entry's test asserts its message and its fix.
// hyperframes.js imports this module too, so the pin is read only inside functions, never while this module loads.
import { HYPERFRAMES } from "./hyperframes.js";

/** A usage error: no studio, an unknown film or format, a bad option. The CLI exits 2. */
export class FilmkitError extends Error {
  exit = 2;
  /**
   * @param {string} message the whole sentence, fix included
   * @param {{ code?: string, fix?: string }} [details] the catalogue code, and the fix on its own (a command, or what to write)
   */
  constructor(message, { code, fix } = {}) {
    super(message);
    this.code = code;
    this.fix = fix;
  }
}

/** A missing requirement (Node's npx, ffmpeg, Chrome). The CLI exits 3. */
export class RequirementError extends FilmkitError {
  exit = 3;
}

/**
 * @typedef {Record<string, any>} Params
 * @typedef {{ exit: 1 | 2 | 3, message: (p: Params) => string, fix: (p: Params) => [lead: string, fix: string], why: string }} Entry
 */

/** How each OS installs a package, for the requirements' fixes. */
const INSTALL = {
  ffmpeg: { darwin: "brew install ffmpeg", win32: "winget install --id Gyan.FFmpeg -e", linux: "sudo apt install ffmpeg" },
  node: { darwin: "brew install node", win32: "winget install --id OpenJS.NodeJS.LTS -e", linux: "https://nodejs.org/en/download" },
};

/** @param {keyof typeof INSTALL} what @param {string} [platform] @returns {string} */
const install = (what, platform = process.platform) => INSTALL[what][/** @type {"linux"} */ (platform)] ?? INSTALL[what].linux;

/** @param {string[]} names */
const list = (names) => (names.length ? names.join(", ") : "none yet");

/** @type {Record<string, Entry>} */
export const CATALOGUE = {
  unknown_command: {
    exit: 2,
    message: ({ command }) => `There's no filmkit command called "${command}".`,
    fix: () => ["See the commands with", "filmkit --help"],
    why: "The CLI runs one command at a time, named first: filmkit check launch. `filmkit --help` lists them all.",
  },
  unknown_option: {
    exit: 2,
    message: ({ command, option }) => `filmkit ${command} has no option ${option}.`,
    fix: () => ["See each command's options with", "filmkit --help"],
    why: "Each command takes its own options, plus --json and --studio <dir>, which every command takes. " +
      "`filmkit --help` lists each command with its options.",
  },
  no_studio: {
    exit: 2,
    message: ({ dir, walked }) => `No filmkit.json in ${dir}${walked ? " or above" : ""}, so there's no studio here.`,
    fix: () => ["Make one with", "filmkit init"],
    why: "Filmkit works on a studio: a folder with filmkit.json, films/, build/ and renders/. It looks for the nearest " +
      "filmkit.json from the current directory up, or uses the one --studio <dir> names. `filmkit init` makes a " +
      "studio that already checks and renders.",
  },
  config_json: {
    exit: 2,
    message: ({ error }) => `filmkit.json isn't valid JSON: ${error}.`,
    fix: ({ at }) => ["Fix it at", at],
    why: "filmkit.json holds the studio's settings (theme, formats) as one JSON object. Its keys are quoted, and the " +
      "last item in a list or object has no trailing comma.",
  },
  config_key: {
    exit: 2,
    message: ({ key, want }) => `filmkit.json "${key}" should be ${want}.`,
    fix: ({ example }) => ["For example", example],
    why: "Each key in filmkit.json has one shape: \"theme\" is a theme's name, \"formats\" a list of formats. " +
      "Leave a key out to take its default.",
  },
  unknown_theme: {
    exit: 2,
    message: ({ theme, themes }) => `filmkit.json "theme": there's no theme called "${theme}". Themes: ${list(themes)}.`,
    fix: ({ themes }) => ["Set it to one of them, as in", `"theme": "${themes.includes("default") ? "default" : themes[0]}"`],
    why: "A theme is the brand as data: grounds, accent, fonts, logo and motif. filmkit.json names one of the " +
      "built-in themes, or leaves \"theme\" out for \"default\".",
  },
  unknown_format: {
    exit: 2,
    message: ({ formats, where }) => `${where ? `${where}: there's` : "There's"} no format called ${formats.map((/** @type {string} */ f) => `"${f}"`).join(", ")}.`,
    fix: ({ known }) => ["Use one of", known.join(" ")],
    why: "Filmkit lays each film out for four frames: 16x9 (1920 × 1080), 9x16 (1080 × 1920), 1x1 (1080 × 1080) " +
      "and 4x5 (1080 × 1350). They're written with an x, never a colon.",
  },
  film_unnamed: {
    exit: 2,
    message: ({ films }) => `Name a film. Films: ${list(films)}.`,
    fix: ({ films }) => (films.length ? ["For example", `filmkit check ${films[0]}`] : ["Make one with", "filmkit new <film>"]),
    why: "Every film command works on one film in films/, named after the command: filmkit check launch.",
  },
  no_film: {
    exit: 2,
    message: ({ film, films }) => `No film called "${film}" in this studio. Films: ${list(films)}.`,
    fix: ({ film }) => ["Make it with", `filmkit new ${film}`],
    why: "A film is a folder in the studio's films/, with index.html as its master. `filmkit new <film>` makes one " +
      "from a template that already checks.",
  },
  studio_exists: {
    exit: 2,
    message: ({ dir }) => `${dir} is already a studio.`,
    fix: () => ["Make a film in it with", "filmkit new <film>"],
    why: "init makes a studio, and a folder holds one: its filmkit.json says so. In a studio, `filmkit new <film>` " +
      "adds films.",
  },
  new_unnamed: {
    exit: 2,
    message: () => "Name the new film.",
    fix: () => ["For example", "filmkit new launch --template statement"],
    why: "A film's name is its folder in films/ and the start of its renders' names, so new needs one.",
  },
  bad_film_name: {
    exit: 2,
    message: ({ film }) => `"${film}" can't be a film's name: it takes lowercase letters, digits and dashes.`,
    fix: ({ film }) => ["For example", `filmkit new ${String(film).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "launch"}`],
    why: "A film's name goes into file names (renders/<film>-<format>.mp4) and commands, so it stays plain: " +
      "lowercase letters, digits and dashes, like launch-teaser.",
  },
  unknown_template: {
    exit: 2,
    message: ({ template, templates }) => `There's no template called "${template}". Templates: ${list(templates)}.`,
    fix: ({ film, templates }) => ["Use one, as in", `filmkit new ${film} --template ${templates[0]}`],
    why: "new copies a starting film from one of Filmkit's templates; each one checks as it's made.",
  },
  film_exists: {
    exit: 2,
    message: ({ film }) => `films/${film} already exists.`,
    fix: ({ film }) => ["Pick another name, or carry on in", `films/${film}/brief.md`],
    why: "new never overwrites a film. Give the new one another name, or carry on with the one that's there.",
  },
  no_root: {
    exit: 2,
    message: ({ film }) => `films/${film}/index.html has no root composition.`,
    fix: () => ["Wrap the film in", '<div id="main" data-composition-id="main" data-duration="10">'],
    why: "Every format is laid out from the master's root composition, the element with " +
      'data-composition-id="main": Filmkit sets its data-width and data-height per format, and reads its ' +
      "data-duration and data-formats.",
  },
  unknown_scene: {
    exit: 2,
    message: ({ film, scene }) => `films/${film}/index.html uses kit/scenes/${scene}.html, and the kit has no scene "${scene}".`,
    fix: ({ scenes }) => ["Use one of", scenes.join(", ")],
    why: "Kit scenes are copied into every build from the installed filmkit, so a film can mount only the ones it " +
      "ships. The film's own scenes go in its compositions/ folder.",
  },
  no_time: {
    exit: 2,
    message: () => "Say when, in seconds.",
    fix: ({ film }) => ["For example", `filmkit stills ${film} 2.5`],
    why: "A still is one frame of the film, so stills needs the time to take it at, in seconds from the start.",
  },
  node_missing: {
    exit: 3,
    message: () => "npx isn't on the PATH, so HyperFrames can't run.",
    fix: ({ platform }) => ["Install Node ≥ 20 (it brings npx) with", install("node", platform)],
    why: "HyperFrames renders every film, and runs through npx at the version Filmkit pins. npx comes with Node: " +
      "install Node ≥ 20 (https://nodejs.org), then `filmkit doctor` checks it.",
  },
  node_old: {
    exit: 3,
    message: ({ version }) => `Node ${version} is older than 20.`,
    fix: ({ platform }) => ["Install Node ≥ 20 with", install("node", platform)],
    why: "Filmkit and HyperFrames use Node 20's built-in APIs. Install Node ≥ 20 (https://nodejs.org), then " +
      "`filmkit doctor` checks it.",
  },
  ffmpeg_missing: {
    exit: 3,
    message: () => "ffmpeg isn't on the PATH.",
    fix: ({ platform }) => ["Install it with", install("ffmpeg", platform)],
    why: "Filmkit uses the ffmpeg on the PATH for the work HyperFrames doesn't do itself, such as the stills' " +
      "thumbnail and the seam's frames. Install it with your package manager (brew, winget or apt), then `filmkit doctor` checks it.",
  },
  hyperframes_offline: {
    exit: 3,
    message: () => `npx couldn't fetch ${HYPERFRAMES}.`,
    fix: () => ["It downloads once, on first use: connect to the network and run", "filmkit doctor"],
    why: "Filmkit runs HyperFrames at one pinned version, so a re-render is identical. npx downloads that version " +
      "the first time and runs it from its cache after, so the first run needs the network: run `filmkit doctor` " +
      "once you're online.",
  },
  chrome_missing: {
    exit: 3,
    message: () => "HyperFrames has no Chrome to render with.",
    fix: () => ["Fetch it once (about 2 minutes) with", `npx ${HYPERFRAMES} browser ensure`],
    why: "HyperFrames plays each film in headless Chrome to check, snapshot and render it. It fetches its own copy " +
      "once and reuses it. `filmkit doctor` checks for it, and gives the command that fetches it.",
  },
  no_report: {
    exit: 1,
    message: () => "HyperFrames gave no report.",
    fix: () => ["See what's missing with", "filmkit doctor"],
    why: "check runs HyperFrames on each format and reads its report. With none, HyperFrames itself didn't run: " +
      "most often it couldn't be fetched (the first run needs the network) or Chrome is missing. `filmkit doctor` " +
      "says which.",
  },
  unknown_code: {
    exit: 2,
    message: ({ code }) => `There's no error or rule called "${code}".`,
    fix: () => ["See them all with", "filmkit explain"],
    why: "Every Filmkit error and check finding has a code, and `filmkit explain <code>` says why it exists and how " +
      "to fix it.",
  },
};

/**
 * A catalogue entry filled in: the whole sentence to print, the next step on its own, and the fix in it.
 * @param {string} code
 * @param {Params} [params]
 */
export function describe(code, params = {}) {
  const entry = CATALOGUE[code];
  const [lead, fix] = entry.fix(params);
  const next = `${lead}: ${fix}`;
  return { code, message: `${entry.message(params)} ${next}`, next, fix };
}

/**
 * The catalogue's error, to throw.
 * @param {string} code
 * @param {Params} [params]
 */
export function fail(code, params) {
  const { message, fix } = describe(code, params);
  const Kind = CATALOGUE[code].exit === 3 ? RequirementError : FilmkitError;
  return new Kind(message, { code, fix });
}
