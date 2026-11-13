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
    { theme: "nope", themes: ["angle", "default"] },
    'There\'s no theme called "nope". Themes: angle, default, or a folder with a theme.json. Name one of them, as in: "theme": "default"',
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
  chrome_missing: [
    {},
    `HyperFrames has no Chrome to render with. Fetch it once (about 2 minutes) with: npx ${HYPERFRAMES} browser ensure`,
    `npx ${HYPERFRAMES} browser ensure`,
  ],
  no_report: [{}, "HyperFrames gave no report. See what's missing with: filmkit doctor", "filmkit doctor"],
  unknown_code: [{ code: "nope" }, 'There\'s no error or rule called "nope". See them all with: filmkit explain', "filmkit explain"],
};

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
