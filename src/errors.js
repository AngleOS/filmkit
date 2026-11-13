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

// A check finding's parameters: the film, the format and the time it was seen at, the element by its text (`label`)
// and what it collides with (`other`).
/** @param {Params} p */
const when = ({ format, time }) => `${format} at ${time} s`;
/** @param {Params} p */
export const snapshot = ({ film, format, time }) => `filmkit snapshot ${film} ${format} --at ${time}`;
/** @param {string} lead @returns {(p: Params) => [string, string]} */
const showing = (lead) => (p) => [lead, snapshot(p)];

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
    message: ({ problems }) => `filmkit.json: ${problems.join("; ")}.`,
    fix: ({ schema }) => ["Each key is described in", schema],
    why: "filmkit.json is checked against Filmkit's JSON schema whenever a command opens the studio: \"name\", " +
      "\"formats\", \"theme\" and \"renders\", each with one shape. Leave a key out to take its default; an editor " +
      "that reads the schema (\"$schema\") completes and checks the keys as you type.",
  },
  unknown_theme: {
    exit: 2,
    message: ({ theme, themes }) => `There's no theme called "${theme}". Themes: ${themes.join(", ")}, or a folder with a theme.json.`,
    fix: ({ themes }) => ["Name one of them, as in", `"theme": "${themes.includes("default") ? "default" : themes[0]}"`],
    why: "A theme is the brand as data: grounds, accent, fonts, logo and motif. filmkit.json names a built-in " +
      "theme, a theme folder in the studio, or single values over one of those; with no \"theme\" it's \"default\".",
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
    message: ({ why }) => `HyperFrames gave no report${why ? ` (${why})` : ""}.`,
    fix: () => ["See what's missing with", "filmkit doctor"],
    why: "check runs HyperFrames on each format and reads its report. With none, HyperFrames itself didn't run: " +
      "most often it couldn't be fetched (the first run needs the network) or Chrome is missing. `filmkit doctor` " +
      "says which.",
  },
  content_overlap: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} overlaps ${p.other}.`,
    fix: showing("See it with"),
    why: "Two text blocks on top of each other can't be read, in any format. Each format is laid out for its own " +
      "frame, so text that sits apart in 16x9 can meet in 9x16 or 1x1. Give each block its own zone with " +
      "AL.pick({ L, S, V }), or put data-layout-allow-overlap on the text when the layering is meant.",
  },
  text_box_overflow: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} runs out of ${p.other}${p.by}.`,
    fix: showing("See it with"),
    why: "Text that's wider than its box spills over what's next to it, or out of the frame. It happens most in the " +
      "narrow formats (9x16, 1x1, 4x5), where the same line has less room: write the line breaks into the copy, " +
      "shorten the line, or let the box grow.",
  },
  canvas_overflow: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} runs out of the frame${p.by}.`,
    fix: showing("See it with"),
    why: "Words outside the frame aren't in the film. Keep words and the key action inside the format's safe zone " +
      "(AL.safe): 5 % of 16x9, 64 px in 1x1 and 4x5, and clear of the feed's header, buttons and caption block in " +
      "9x16. Mark an entrance or exit that travels off the frame with data-layout-allow-overflow.",
  },
  container_overflow: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} spills out of ${p.other}, which cuts it off.`,
    fix: showing("See it with"),
    why: "A box with overflow hidden cuts off whatever leaves it, so the part outside never shows. Size the child " +
      "to fit, or the box to hold it.",
  },
  clipped_text: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} is cut off by its own box.`,
    fix: showing("See it with"),
    why: "Text taller or wider than its own box, with overflow hidden, loses letters. Let the box fit the text, or " +
      "set the text smaller.",
  },
  text_occluded: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} is covered by ${p.other}.`,
    fix: showing("See it with"),
    why: "Text under something opaque can't be read. Later hosts paint over earlier ones, so a scene over another " +
      "covers its words. Move one, end the lower one first, or put data-layout-allow-occlusion on the element " +
      "that's meant to cover the text.",
  },
  contrast_aa_failure: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} is ${p.ratio}:1 against its ground, under WCAG AA's ${p.required}:1${p.suggested ? `; ${p.suggested} would pass` : ""}.`,
    fix: showing("See it with"),
    why: "Text must stand out from its ground to be read on a phone in daylight: WCAG AA asks 4.5:1, or 3:1 for " +
      "large text. Use the theme's text colour for its ground (each ground has one), and keep the accent for one " +
      "word on a ground it reads on.",
  },
  line_unread: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} is on screen ${p.seconds} s, under the ${p.floor} s it needs to be read.`,
    fix: showing("Hold it longer (about 0.5 s + 0.3 s a word). See it with"),
    why: "A line has to stay long enough to be read: 0.4 s for one or two words, otherwise about 0.5 s and 0.3 s a " +
      "word, and the film's last line 2 s. Hold the card 1.15–1.5 s after its last word lands.",
  },
  text_below_floor: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} is ${p.px} px, under the ${p.floor} px a phone can read.`,
    fix: (p) => [`Set it to at least ${p.floor} px. See it with`, snapshot(p)],
    why: "The type floor is 28 px at 1080 (2.6 % of the frame's short side), the smallest a phone can read. " +
      "Statements are far bigger: 110–140 px in 9x16. Text that's texture, not reading, takes data-layout-ignore.",
  },
  dead_stretch: {
    exit: 1,
    message: (p) => `${when(p)}: nothing on screen changes for ${p.seconds} s.`,
    fix: showing("Start the next move within 3 s, or put data-hold on what holds still on purpose. See it with"),
    why: "More than 3 s where nothing moves reads as a frozen film, and viewers scroll on. Give the hold a real " +
      "next action; an end card's last 3 s are exempt.",
  },
  first_frame_empty: {
    exit: 1,
    message: (p) => `${when(p)}: frame 0 shows only the ground, and it's the thumbnail on social feeds.`,
    fix: showing("Have the title on screen at 0 s (\"entrance\": \"none\"). See it with"),
    why: "Feeds and players show a film's first frame before it plays, so frame 0 is its poster. Start with the " +
      "hook line already on screen.",
  },
  film_silent: {
    exit: 1,
    message: ({ format, duration }) => `${format}: the film runs ${duration} s with no sound.`,
    fix: ({ film }) => ["Give it sound from its motion in", `films/${film}/sound.json`],
    why: "A film over 15 s plays better with sound. Filmkit makes it from the motion in sound.json: cues on what " +
      "moves over a tonal pad, mixed to −19 LUFS. A hook loop is silent on purpose.",
  },
  seam: {
    exit: 1,
    message: ({ format, step, limit }) => `${format}: the loop's last frame doesn't flow into frame 0 (a step of ${step}, over the limit of ${limit}).`,
    fix: ({ film, format, end }) => ["See the seam with", `filmkit snapshot ${film} ${format} --at ${end},0`],
    why: "A loop plays again from frame 0 as soon as it ends, so the step from its last frame to frame 0 may be at " +
      "most 1.5 × the median step at its ends (and at least 0.4). Return to frame 0 through an action and hold " +
      "still across the seam, or keep moving at one speed.",
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
