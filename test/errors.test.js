import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOGUE, FilmkitError, RequirementError, describe, fail } from "../src/errors.js";
import { HYPERFRAMES } from "../src/hyperframes.js";

const FORMATS = ["16x9", "9x16", "1x1", "4x5"];

/** Each code: the parameters it's thrown with, the whole message, and the fix on its own. */
const CASES = {
  unknown_command: [{ command: "dance" }, 'There\'s no filmkit command called "dance". See the commands with: filmkit --help', "filmkit --help"],
  unknown_option: [{ command: "check", option: "--fast" }, "filmkit check has no option --fast. See each command's options with: filmkit --help", "filmkit --help"],
  no_studio: [{ dir: "/home/a", walked: true }, "No filmkit.json in /home/a or above, so there's no studio here. Make one with: filmkit init", "filmkit init"],
  config_json: [
    { error: "Expected ',' or '}' after property value", at: "/s/filmkit.json:2:3" },
    "filmkit.json isn't valid JSON: Expected ',' or '}' after property value. Fix it at: /s/filmkit.json:2:3",
    "/s/filmkit.json:2:3",
  ],
  config_key: [
    { problems: ['formats[1]: "21x9" should be one of 16x9, 9x16, 1x1, 4x5'], schema: "/p/schema/filmkit.schema.json" },
    'filmkit.json: formats[1]: "21x9" should be one of 16x9, 9x16, 1x1, 4x5. Each key is described in: /p/schema/filmkit.schema.json',
    "/p/schema/filmkit.schema.json",
  ],
  unknown_theme: [
    { theme: "nope", themes: ["angle", "default", "paper"] },
    'There\'s no theme called "nope". Themes: angle, default, paper, or a folder with a theme.json. Name one of them, as in: "theme": "default"',
    '"theme": "default"',
  ],
  unknown_format: [{ formats: ["16:9"], known: FORMATS }, 'There\'s no format called "16:9". Use one of: 16x9 9x16 1x1 4x5', "16x9 9x16 1x1 4x5"],
  film_unnamed: [{ films: ["hello", "smoke"] }, "Name a film. Films: hello, smoke. For example: filmkit check hello", "filmkit check hello"],
  no_film: [
    { film: "launch", films: ["hello", "smoke"] },
    'No film called "launch" in this studio. Films: hello, smoke. Make it with: filmkit new launch',
    "filmkit new launch",
  ],
  studio_exists: [{ dir: "/home/a/films" }, "/home/a/films is already a studio. Make a film in it with: filmkit new <film>", "filmkit new <film>"],
  new_unnamed: [{}, "Name the new film. For example: filmkit new launch --template statement", "filmkit new launch --template statement"],
  bad_film_name: [
    { film: "Launch Film" },
    "\"Launch Film\" can't be a film's name: it takes lowercase letters, digits and dashes. For example: filmkit new launch-film",
    "filmkit new launch-film",
  ],
  unknown_template: [
    { film: "x", template: "documentary", templates: ["poster", "statement"] },
    'There\'s no template called "documentary". Templates: poster, statement. Use one, as in: filmkit new x --template poster',
    "filmkit new x --template poster",
  ],
  film_exists: [{ film: "launch" }, "films/launch already exists. Pick another name, or carry on in: films/launch/brief.md", "films/launch/brief.md"],
  no_root: [
    { film: "launch" },
    'films/launch/index.html has no root composition. Wrap the film in: <div id="main" data-composition-id="main" data-duration="10">',
    '<div id="main" data-composition-id="main" data-duration="10">',
  ],
  unknown_scene: [
    { film: "launch", scene: "titel", scenes: ["mark", "title"] },
    'films/launch/index.html uses kit/scenes/titel.html, and the kit has no scene "titel". Use one of: mark, title',
    "mark, title",
  ],
  no_scene: [{ scene: "titel", scenes: ["mark", "title"] }, 'The kit has no scene called "titel". Scenes: mark, title', "mark, title"],
  no_time: [{ film: "hook" }, "Say when, in seconds. For example: filmkit stills hook 2.5", "filmkit stills hook 2.5"],
  node_missing: [
    { platform: "darwin" },
    "npx isn't on the PATH, so HyperFrames can't run. Install Node ≥ 20 (it brings npx) with: brew install node",
    "brew install node",
  ],
  node_old: [{ version: "v18.19.0", platform: "linux" }, "Node v18.19.0 is older than 20. Install Node ≥ 20 with: https://nodejs.org/en/download", "https://nodejs.org/en/download"],
  ffmpeg_missing: [{ platform: "win32" }, "ffmpeg isn't on the PATH. Install it with: winget install --id Gyan.FFmpeg -e", "winget install --id Gyan.FFmpeg -e"],
  hyperframes_offline: [
    {},
    `npx couldn't fetch ${HYPERFRAMES}. It downloads once, on first use: connect to the network and run: filmkit doctor`,
    "filmkit doctor",
  ],
  hyperframes_no_skills: [
    { dir: "/c/_npx/1/node_modules/hyperframes/dist/skills" },
    `${HYPERFRAMES} has no skills in /c/_npx/1/node_modules/hyperframes/dist/skills. Delete npx's cache (the _npx folder in \`npm config get cache\`) and run: filmkit skills`,
    "filmkit skills",
  ],
  chrome_missing: [
    {},
    `HyperFrames has no Chrome to render with. Fetch it once (about 2 minutes) with: npx ${HYPERFRAMES} browser ensure`,
    `npx ${HYPERFRAMES} browser ensure`,
  ],
  no_report: [{}, "HyperFrames gave no report. See what's missing with: filmkit doctor", "filmkit doctor"],
  ...findings(),
  seam: [
    { film: "hook", format: "9x16", step: 0.9, limit: 0.4, end: 7.96 },
    "9x16: the loop's last frame doesn't flow into frame 0 (a step of 0.9, over the limit of 0.4). See the seam with: filmkit snapshot hook 9x16 --at 7.96,0",
    "filmkit snapshot hook 9x16 --at 7.96,0",
  ],
  theme_contrast: [
    { role: "muted", key: "text.muted", colour: "#4a5a52", ground: "ink", on: "#07120f", ratio: 2.6, required: 4.5, suggested: "#727e78" },
    'The theme\'s muted text #4a5a52 on the ink ground (#07120f) is 2.6:1, under WCAG AA\'s 4.5:1. Set text.muted in filmkit.json\'s "theme" to a colour that passes, such as: #727e78',
    "#727e78",
  ],
  unknown_code: [{ code: "nope" }, 'There\'s no error or rule called "nope". See them all with: filmkit explain', "filmkit explain"],
};

/** The check findings: each is seen at a time in a format, and its fix is the snapshot that shows it. */
function findings() {
  const at = { film: "launch", format: "9x16", time: 12.4, label: '"Films are code" (#t)', other: '"Four frames" (#s)' };
  const show = "filmkit snapshot launch 9x16 --at 12.4";
  /** @type {Record<string, [Record<string, any>, string, string]>} */
  const cases = {};
  /** @param {string} code @param {Record<string, any>} params @param {string} said @param {string} [lead] */
  const add = (code, params, said, lead = "See it with") => (cases[code] = [{ ...at, ...params }, `9x16 at 12.4 s: ${said} ${lead}: ${show}`, show]);
  add("content_overlap", {}, '"Films are code" (#t) overlaps "Four frames" (#s).');
  add("text_box_overflow", { other: "#box", by: " by 40 px" }, '"Films are code" (#t) runs out of #box by 40 px.');
  add("canvas_overflow", { by: " by 12 px" }, '"Films are code" (#t) runs out of the frame by 12 px.');
  add("container_overflow", { other: "#card" }, '"Films are code" (#t) spills out of #card, which cuts it off.');
  add("clipped_text", {}, '"Films are code" (#t) is cut off by its own box.');
  add("text_occluded", { other: "#window" }, '"Films are code" (#t) is covered by #window.');
  add("contrast_aa_failure", { ratio: 2.1, required: 4.5, suggested: "rgb(140,140,140)" }, '"Films are code" (#t) is 2.1:1 against its ground, under WCAG AA\'s 4.5:1; rgb(140,140,140) would pass.');
  add("line_unread", { seconds: 0.5, floor: 1.05 }, '"Films are code" (#t) is on screen 0.5 s, under the 1.05 s it needs to be read.', "Hold it longer (about 0.5 s + 0.3 s a word). See it with");
  add("text_below_floor", { px: 18, floor: 28 }, '"Films are code" (#t) is 18 px, under the 28 px a phone can read.', "Set it to at least 28 px. See it with");
  add("dead_stretch", { seconds: 4.2 }, "nothing on screen changes for 4.2 s.", "Start the next move within 3 s, or put data-hold on what holds still on purpose. See it with");
  add("first_frame_empty", {}, "frame 0 shows only the ground, and it's the thumbnail on social feeds.", 'Have the title on screen at 0 s ("entrance": "none"). See it with');
  cases.film_silent = [{ ...at, duration: 30 }, "9x16: the film runs 30 s with no sound. Give it sound from its motion in: films/launch/sound.json", "films/launch/sound.json"];
  return cases;
}

test("every catalogue entry is tested here", () => {
  assert.deepEqual(Object.keys(CASES).sort(), Object.keys(CATALOGUE).sort());
});

for (const [code, [params, message, fix]] of Object.entries(CASES)) {
  test(`${code}: names the thing, says what's wrong and gives the fix`, () => {
    const described = describe(code, params);
    assert.equal(described.message, message);
    assert.equal(described.fix, fix);
    assert.ok(message.endsWith(fix));
  });
}

test("each entry says why, for explain, in Angle's voice", () => {
  for (const [code, { why }] of Object.entries(CATALOGUE)) {
    assert.match(why, /^[A-Z`a-z].+\.$/, code);
    assert.doesNotMatch(why + CASES[/** @type {keyof CASES} */ (code)][1], /!|Oops|Successfully/, code);
  }
});

test("the fix for a missing requirement is the install command for the OS", () => {
  assert.equal(describe("ffmpeg_missing", { platform: "darwin" }).fix, "brew install ffmpeg");
  assert.equal(describe("ffmpeg_missing", { platform: "linux" }).fix, "sudo apt install ffmpeg");
  assert.equal(describe("ffmpeg_missing", { platform: "freebsd" }).fix, "sudo apt install ffmpeg");
  assert.equal(describe("node_missing", { platform: "win32" }).fix, "winget install --id OpenJS.NodeJS.LTS -e");
});

test("a format from a setting names it", () => {
  assert.match(describe("unknown_format", { formats: ["21x9"], where: 'filmkit.json "formats"', known: FORMATS }).message, /^filmkit\.json "formats": there's no format called "21x9"\./);
});

test("fail makes the error to throw: a usage error exits 2, a missing requirement 3", () => {
  const usage = fail("no_film", { film: "launch", films: [] });
  assert.ok(usage instanceof FilmkitError && !(usage instanceof RequirementError));
  assert.deepEqual([usage.exit, usage.code, usage.fix], [2, "no_film", "filmkit new launch"]);
  assert.match(usage.message, /Films: none yet\./);
  const requirement = fail("ffmpeg_missing");
  assert.ok(requirement instanceof RequirementError);
  assert.equal(requirement.exit, 3);
});
