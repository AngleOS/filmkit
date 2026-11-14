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
/** A theme's colours by what they colour, as theme_contrast names them. @type {Record<string, string>} */
const ROLE = { text: "text", muted: "muted text", accent: "accent" };

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
  option_value: {
    exit: 2,
    message: ({ command, option, takes }) => `In filmkit ${command}, ${option} ${takes ? "needs a value" : "takes no value"}.`,
    fix: () => ["See each command's options with", "filmkit --help"],
    why: "An option that takes a value has it next, as --every 2s or --every=2s; a flag such as --force stands alone.",
  },
  option_choice: {
    exit: 2,
    message: ({ command, option, value, choices }) => `In filmkit ${command}, ${option} is ${choices.join(" or ")}, not "${value}".`,
    fix: ({ option, choices }) => ["For example", `${option} ${choices[0]}`],
    why: "Some options take one of a few words, such as setup's --ground dark or light; `filmkit --help` names them.",
  },
  prompt_missing: {
    exit: 2,
    message: ({ page }) => `${page} has no \`\`\`\`text block, so there's no prompt to print.`,
    fix: () => ["Copy it from", "https://github.com/AngleOS/filmkit/blob/master/docs/install-with-your-agent.md"],
    why: "filmkit prompt prints the fenced block of docs/install-with-your-agent.md, which ships in the package. A " +
      "page without it was edited or damaged: the copy on GitHub has the prompt.",
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
  theme_missing: {
    exit: 2,
    message: ({ file }) => `There's no ${file}.`,
    fix: () => ["Point \"theme\" at a folder that has one, or name a built-in theme, as in", '"theme": "default"'],
    why: "A theme folder is known by its theme.json. filmkit.json's \"theme\", and a theme.json's \"extends\", take a " +
      "built-in theme's name or a folder's path, from the file they're in.",
  },
  theme_json: {
    exit: 2,
    message: ({ file, error }) => `${file} isn't valid JSON: ${error}.`,
    fix: ({ at }) => ["Fix it at", at],
    why: "A theme.json holds the brand as one JSON object. Its keys are quoted, and the last item in a list or object " +
      "has no trailing comma.",
  },
  theme_key: {
    exit: 2,
    message: ({ theme, problems }) => `${theme}: ${problems.join("; ")}.`,
    fix: ({ schema }) => ["Each key is described in", schema],
    why: "Each theme.json is checked against Filmkit's schema, and so is the theme it makes with its bases: grounds " +
      "(ink, accent-dark and paper at least), the accent, text and fonts, every colour in hex. docs/themes.md " +
      "describes each key.",
  },
  theme_cycle: {
    exit: 2,
    message: ({ file }) => `${file} extends itself.`,
    fix: () => ["Have it extend another theme, as in", '"extends": "default"'],
    why: "A theme's \"extends\" names the theme it's based on, and the chain has to end: at a built-in theme, or at " +
      "a theme.json with no \"extends\".",
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
  bad_start: {
    exit: 2,
    message: ({ film, problem }) => `films/${film}/index.html: ${problem}.`,
    fix: () => ["Start it at a time in seconds, or after a clip that's in the film, as in", 'data-start="intro + 0.5"'],
    why: "A clip's data-start is a time in seconds, or the id of the clip it follows (\"intro\", \"intro + 0.5\", " +
      "\"intro - 1\"). Filmkit follows those starts to place the sound's cues and the captions, so each has to lead " +
      "to a time.",
  },
  captions_json: {
    exit: 2,
    message: ({ film, error }) => `films/${film}/index.html: the captions' data-variable-values isn't valid JSON: ${error}.`,
    fix: () => ["Write it as one object, as in", `data-variable-values='{"lines": "0.2-2.4 Films are code"}'`],
    why: "The captions scene's lines are the film's captions, burned in and written to renders/<film>.srt and .vtt, " +
      "so Filmkit reads them from its data-variable-values: one JSON object, in single quotes in the HTML.",
  },
  unknown_scene: {
    exit: 2,
    message: ({ film, scene }) => `films/${film}/index.html uses kit/scenes/${scene}.html, and the kit has no scene "${scene}".`,
    fix: ({ scenes }) => ["Use one of", scenes.join(", ")],
    why: "Kit scenes are copied into every build from the installed filmkit, so a film can mount only the ones it " +
      "ships. The film's own scenes go in its compositions/ folder.",
  },
  no_scene: {
    exit: 2,
    message: ({ scene }) => `The kit has no scene called "${scene}".`,
    fix: ({ scenes }) => ["Scenes", scenes.join(", ")],
    why: "`filmkit scenes` lists the scenes this filmkit ships, read from the scenes themselves, and " +
      "`filmkit scenes <name>` shows one with its variables. A film's own scenes are in its compositions/ folder.",
  },
  no_time: {
    exit: 2,
    message: () => "Say when, in seconds.",
    fix: ({ film }) => ["For example", `filmkit stills ${film} 2.5`],
    why: "A still is one frame of the film, so stills needs the time to take it at, in seconds from the start.",
  },
  bad_times: {
    exit: 2,
    message: ({ option, value }) => `${option} ${value} isn't ${option === "--every" ? "a number of seconds" : "a list of times in seconds"}.`,
    fix: ({ film, option }) => ["For example", `filmkit contact ${film} ${option === "--every" ? "--every 2s" : "--at 0,2.5,6"}`],
    why: "A contact sheet shows a frame of each scene just after it starts, or one at each time given (--at), or " +
      "one every few seconds (--every), at most 48 to a sheet so each frame can still be read.",
  },
  times_both: {
    exit: 2,
    message: () => "Give --every or --at, not both.",
    fix: ({ film }) => ["For example", `filmkit contact ${film} --every 2s`],
    why: "A contact sheet shows a frame of each scene just after it starts, or one at each time given (--at), or " +
      "one every few seconds (--every), at most 48 to a sheet so each frame can still be read.",
  },
  past_end: {
    exit: 2,
    message: ({ film, late, duration }) => `--at ${late.join(",")} is past the end of ${film}, at ${duration} s.`,
    fix: ({ film }) => ["See a frame of each scene with", `filmkit contact ${film}`],
    why: "A contact sheet shows a frame of each scene just after it starts, or one at each time given (--at), or " +
      "one every few seconds (--every), at most 48 to a sheet so each frame can still be read.",
  },
  no_scenes: {
    exit: 2,
    message: ({ film }) => `films/${film} has no timed scenes to show.`,
    fix: ({ film }) => ["Give the times with", `filmkit contact ${film} --at 0,2,4`],
    why: "A contact sheet shows a frame of each scene just after it starts, or one at each time given (--at), or " +
      "one every few seconds (--every), at most 48 to a sheet so each frame can still be read.",
  },
  too_many_frames: {
    exit: 2,
    message: ({ count, max }) => `${count} frames is too many for one sheet, which takes ${max}.`,
    fix: ({ film, every }) => ["Take one every few seconds, as in", `filmkit contact ${film} --every ${every}s`],
    why: "A contact sheet shows a frame of each scene just after it starts, or one at each time given (--at), or " +
      "one every few seconds (--every), at most 48 to a sheet so each frame can still be read.",
  },
  node_missing: {
    exit: 3,
    message: () => "npx isn't on the PATH, so HyperFrames can't run.",
    fix: ({ platform }) => ["Install Node ≥ 20.12 (it brings npx) with", install("node", platform)],
    why: "HyperFrames renders every film, and runs through npx at the version Filmkit pins. npx comes with Node: " +
      "install Node ≥ 20.12 (https://nodejs.org), then `filmkit doctor` checks it.",
  },
  node_old: {
    exit: 3,
    message: ({ version }) => `Node ${version} is older than 20.12.`,
    fix: ({ platform }) => ["Install Node ≥ 20.12 with", install("node", platform)],
    why: "Filmkit and HyperFrames use Node 20.12's built-in APIs. Install Node ≥ 20.12 (https://nodejs.org), then " +
      "`filmkit doctor` checks it.",
  },
  ffmpeg_missing: {
    exit: 3,
    message: () => "ffmpeg isn't on the PATH.",
    fix: ({ platform }) => ["Install it with", install("ffmpeg", platform)],
    why: "Filmkit uses the ffmpeg on the PATH for the work HyperFrames doesn't do itself, such as the stills' " +
      "thumbnail and the seam's frames. Install it with your package manager (brew, winget or apt), then `filmkit doctor` checks it.",
  },
  ffprobe_missing: {
    exit: 3,
    message: () => "ffprobe isn't on the PATH.",
    fix: ({ platform }) => ["It comes with ffmpeg: install that with", install("ffmpeg", platform)],
    why: "HyperFrames' render reads each film's media with ffprobe, which most ffmpeg packages bring with them. " +
      "With ffmpeg on the PATH but not ffprobe, a film checks but doesn't render: install ffmpeg's full package, " +
      "then `filmkit doctor` checks it.",
  },
  hyperframes_offline: {
    exit: 3,
    message: () => `npx couldn't fetch ${HYPERFRAMES}.`,
    fix: () => ["It downloads once, on first use: connect to the network and run", "filmkit doctor"],
    why: "Filmkit runs HyperFrames at one pinned version, so a re-render is identical. npx downloads that version " +
      "the first time and runs it from its cache after, so the first run needs the network: run `filmkit doctor` " +
      "once you're online.",
  },
  hyperframes_no_skills: {
    exit: 3,
    message: ({ dir }) => `${HYPERFRAMES} has no skills in ${dir}.`,
    fix: () => ["Delete npx's cache (the _npx folder in `npm config get cache`) and run", "filmkit skills"],
    why: "`filmkit skills` copies the skills the pinned HyperFrames ships in its package, so they match the CLI " +
      "that renders. An empty folder means npx's copy of the package is incomplete: npx fetches it again once " +
      "its cache is gone.",
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
  safe_zone: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} is under the safe box, in the bottom ${p.band} px, where a feed's caption and buttons cover it.`,
    fix: showing("Move it up into AL.safe, or put data-layout-allow-caption-zone on copy meant for the foot. See it with"),
    why: "Feeds lay their own caption, buttons and progress bar over a film's foot, so words and the key action stay " +
      "in the safe box, AL.safe: 5 % in from 16x9's edges; 64 px in 1x1 and 4x5, 96 px at 4x5's top and foot; in " +
      "9x16, 270 px under the top, 120 px from the right and 420 px over the foot. check samples each scene once it " +
      "has settled and warns of text in the band under the box: HyperFrames measures one band, and the foot hides " +
      "the most. A lower third meant for the foot takes data-layout-allow-caption-zone.",
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
    message: (p) => `${when(p)}: ${p.label} is covered by ${p.other}${p.covered ?? ""}.`,
    fix: showing("See it with"),
    why: "Text under something opaque can't be read. Later hosts paint over earlier ones, so a scene over another " +
      "covers its words. Move one, end the lower one first, or, when the covering is meant, put " +
      "data-layout-allow-occlusion on the covered text: that's where HyperFrames reads it, not on what covers it.",
  },
  contrast_aa_failure: {
    exit: 1,
    message: (p) => `${when(p)}: ${p.label} is ${p.ratio}:1 against its ground, under WCAG AA's ${p.required}:1${p.suggested ? `; ${p.suggested} would pass` : ""}.`,
    fix: showing("See it with"),
    why: "Text must stand out from its ground to be read on a phone in daylight: WCAG AA asks 4.5:1, or 3:1 for " +
      "large text. Use the theme's text colour for its ground (each ground has one), and keep the accent for one " +
      "word on a ground it reads on.",
  },
  theme_contrast: {
    exit: 1,
    message: (p) =>
      `The theme's ${ROLE[p.role]} ${p.colour} on the ${p.ground} ground (${p.on}) is ${p.ratio}:1, under WCAG AA's ${p.required}:1` +
      `${p.role === "accent" ? " for display type" : ""}.`,
    fix: ({ key, suggested }) => [`Set ${key} in filmkit.json's "theme" to a colour that passes, such as`, suggested],
    why: "Each of the theme's grounds is read with its own text colours: the dark grounds with text.ink, text.muted " +
      "and the accent, paper with text.onPaper, text.mutedOnPaper and accentOn.paper. Reading text needs WCAG AA's " +
      "4.5:1 on each, the accent word 3:1, as display type. A Pear word reads on Night and is lost on white, so " +
      "give paper its own accent. The rendered frames are checked as well (contrast_aa_failure).",
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
  sound_json: {
    exit: 2,
    message: ({ film, error }) => `films/${film}/sound.json isn't valid JSON: ${error}.`,
    fix: ({ at }) => ["Fix it at", at],
    why: "sound.json is the film's sound as one JSON object: cues, chords, blooms and pockets placed on its scenes " +
      "(docs/sound.md). Its keys are quoted, and the last item in a list or object has no trailing comma.",
  },
  sound_shape: {
    exit: 2,
    message: ({ film, problem }) => `films/${film}/sound.json: ${problem}.`,
    fix: () => ["Each key is described in", "https://github.com/AngleOS/filmkit/blob/master/docs/sound.md"],
    why: "sound.json is one object whose cues, chords, blooms and pockets are lists of rows, each row an object " +
      "placed on a scene (\"scene\" and \"at\") or at a time (\"t\").",
  },
  sound_scene: {
    exit: 2,
    message: ({ film, problem, clips }) => `films/${film}/sound.json: ${problem}. Clips: ${list(clips)}.`,
    fix: ({ clips }) => ["Place it on one of them, as in", `"scene": "${clips[0] ?? "title"}"`],
    why: "A cue placed on a scene moves with it: \"scene\" is the id of a timed clip in the film's index.html, and " +
      "\"at\" the seconds into it. So a cue stays on its beat when the scenes before it change length.",
  },
  sound_bed: {
    exit: 2,
    message: ({ film, bed }) => `films/${film}/sound.json: "bed" is ${JSON.stringify(bed)}, and it has to be a number: the pad's level under the foley, in dB.`,
    fix: () => ["For example", '"bed": -12'],
    why: "A sound.json's \"bed\" sets how far the tonal pad sits under the foley, in dB (−12 when it's left out). The foley stays " +
      "dry, so it's the one level the mix takes.",
  },
  sound_empty: {
    exit: 1,
    message: ({ film }) => `films/${film}/sound.json places no cues or chords, so there's nothing to hear.`,
    fix: () => ["Place a cue on a scene, as in", '"cues": [{ "id": "hit", "kind": "impact", "scene": "endcard", "at": 2.7 }]'],
    why: "The sound comes from what moves: a cue for each hit, whoosh or click on its scene, and chords for the pad " +
      "under them. A film that should be silent has no sound.json.",
  },
  sound_failed: {
    exit: 1,
    message: ({ film, why }) => `films/${film}: the sound didn't build: ${why}.`,
    fix: () => ["See what's missing with", "filmkit doctor"],
    why: "The sound is rendered in Node (the foley and the pad), then mixed and mastered to −19 LUFS by ffmpeg. When " +
      "a step fails, `filmkit doctor` checks what it needs.",
  },
  seam: {
    exit: 1,
    message: ({ format, step, limit }) => `${format}: the loop's last frame doesn't flow into frame 0 (a step of ${step}, over the limit of ${limit}).`,
    fix: ({ film, format, end }) => ["See the seam with", `filmkit snapshot ${film} ${format} --at ${end},0`],
    why: "A loop plays again from frame 0 as soon as it ends, so the step from its last frame to frame 0 may be at " +
      "most 1.5 × the median step at its ends (and at least 0.4). Return to frame 0 through an action and hold " +
      "still across the seam, or keep moving at one speed.",
  },
  loop_too_short: {
    exit: 2,
    message: ({ min }) => `A loop's root needs a data-duration of at least ${min} s, so its seam can be measured.`,
    fix: () => ["Make it longer, as in", 'data-duration="6"'],
    why: "The seam gate compares a loop's first and last 9 frames, so it needs 18 of them: 0.6 s at 30 fps.",
  },
  seam_unmeasured: {
    exit: 1,
    message: ({ format, why }) => `${format}: the seam couldn't be measured: ${why}.`,
    fix: () => ["See what's missing with", "filmkit doctor"],
    why: "The seam gate renders a loop's first and last 9 frames with HyperFrames and decodes them with ffmpeg, so " +
      "it needs Chrome and ffmpeg both.",
  },
  unknown_tool: {
    exit: 2,
    message: ({ unknown, tools }) => `Filmkit can't register in ${unknown.map((/** @type {string} */ t) => `"${t}"`).join(", ")}. Tools: ${tools.join(", ")}.`,
    fix: () => ["Register in every one that's installed with", "filmkit agents"],
    why: "filmkit agents adds Filmkit's MCP server and skill to the agent tools it knows, each by its id. With no " +
      "ids it does every one that's installed, and leaves the others alone.",
  },
  brand_nothing: {
    exit: 2,
    message: () => "Say what to set for the brand: its name, logo, accent, ground or font, or a website to read them from.",
    fix: () => ["For example", "filmkit brand --name Acme --logo acme.svg --accent '#ff5a1f'"],
    why: "filmkit brand changes only what it's given: --name, --logo (an SVG, or a PNG it embeds), --accent (a hex " +
      "colour), --ground (dark or light) and --font (a Google Fonts family), or --from-url, a website to read the logo, " +
      "accent, ground and font from. The accent and the ground make the palette, brand/theme/theme.json. In a " +
      "terminal, without --yes or --json, it asks for each instead.",
  },
  brand_option: {
    exit: 2,
    message: ({ option, value, expected }) => `In filmkit brand, ${option} "${value}" should be ${expected}.`,
    fix: () => ["For example", "filmkit brand --accent '#ff5a1f'"],
    why: "The accent is the brand's one colour, as a hex such as #ff5a1f; quote it in a shell, where # starts a " +
      "comment.",
  },
  logo_missing: {
    exit: 2,
    message: ({ file }) => `There's no logo at ${file}.`,
    fix: () => ["Give the path to the logo, from this folder, as in", "filmkit brand --logo brand/acme.svg"],
    why: "The --logo option takes the logo's file, an SVG or a PNG, from the current folder. filmkit brand copies it into the " +
      "studio as brand/logo.svg, the mark the logo reveal and the end card draw.",
  },
  bad_logo: {
    exit: 2,
    message: ({ file }) => `${file} isn't an SVG or a PNG.`,
    fix: () => ["Export the logo as an SVG, then", "filmkit brand --logo logo.svg"],
    why: "The logo's mark is drawn as SVG: an SVG is kept as it is, a PNG is embedded in one at its own size. An SVG " +
      "stays sharp at every size and can take the accent (draw it in currentColor).",
  },
  font_unknown: {
    exit: 2,
    message: ({ family }) => `Google Fonts has no family called "${family}".`,
    fix: () => ["Give its name as fonts.google.com spells it, as in", "filmkit brand --font 'IBM Plex Sans'"],
    why: "filmkit brand --font takes a family from Google Fonts, whose fonts are all under open licences, so their " +
      "files can ship in the studio. It copies the regular to bold weights and the licence into brand/theme/fonts. For a " +
      "font that isn't there, add its files and faces to brand/theme/theme.json (docs/themes.md).",
  },
  font_fetch: {
    exit: 1,
    message: ({ url, reason }) => `filmkit brand couldn't fetch ${url}: ${reason}.`,
    fix: () => ["Check the network, then run it again, as in", "filmkit brand --font Inter"],
    why: "filmkit brand --font downloads the family's files from Google Fonts once, into brand/theme/fonts; films " +
      "read them from there, so rendering never needs the network.",
  },
  site_fetch: {
    exit: 1,
    message: ({ url, reason }) => `filmkit brand couldn't read ${url}: ${reason}.`,
    fix: () => ["Check the address and the network, or give the brand's parts yourself, as in", "filmkit brand --logo logo.svg --accent '#ff5a1f'"],
    why: "filmkit brand --from-url reads the site's page, the stylesheets it links and its logo, once, as filmkit's " +
      "own user agent. A site that's down, or turns away requests that aren't from a browser, can't be read; the " +
      "flags set the same things by hand.",
  },
  site_robots: {
    exit: 1,
    message: ({ url }) => `${url}'s robots.txt asks filmkit not to read it.`,
    fix: () => ["Give the brand's parts yourself, as in", "filmkit brand --logo logo.svg --accent '#ff5a1f'"],
    why: "filmkit brand --from-url keeps to the site's robots.txt: where it turns filmkit or every agent away from the " +
      "page, filmkit doesn't read it. Download the logo and pick the colour by hand instead.",
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
