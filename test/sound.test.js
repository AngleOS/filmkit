import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { pad } from "../kit/sound/pad.js";
import { buildSound, loudness, score } from "../src/build/sound.js";
import { FilmkitError, openFilm, openStudio } from "../src/studio.js";

const HTML = `
<div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1920" data-height="1080">
  <div id="title" data-composition-id="title" data-composition-src="kit/scenes/title.html" data-start="0" data-duration="3"></div>
  <div id="chat" data-composition-id="chat" data-composition-src="kit/scenes/chat.html" data-start="2.5" data-duration="4"></div>
  <div id="after" data-composition-id="after" data-composition-src="kit/scenes/mark.html" data-start="chat + 0.5" data-duration="2"></div>
  <div id="before" data-composition-id="before" data-composition-src="kit/scenes/mark.html" data-start="after - 1" data-duration="1"></div>
</div>
`;
const SHEET = fileURLToPath(new URL("../kit/sound/vendor/sound-sheet.mjs", import.meta.url));
const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

test("rows are placed in their scene's time", () => {
  for (const [name, row, t] of [
    ["a number", { scene: "chat", at: 1.25 }, 3.75],
    ["after another clip", { scene: "after", at: 0.2 }, 7.2],
    ["before another clip's end", { scene: "before", at: 0 }, 8],
    ["an absolute row", { t: 4 }, 4],
  ]) {
    assert.equal(score(HTML, { cues: [{ ...(/** @type {object} */ (row)), id: "x", kind: "click" }] }).cues[0].t, t, String(name));
  }
});

test("moving a scene moves its cues", () => {
  const sound = { cues: [{ id: "hit", kind: "impact", scene: "after", at: 0.2 }, { id: "fixed", kind: "tick", t: 1 }] };
  const moved = score(HTML.replace('data-start="2.5"', 'data-start="4"'), sound);
  assert.deepEqual(moved.cues.map((c) => [c.id, c.t]), [["fixed", 1], ["hit", 8.7]]);
});

test("ends resolve too, rows sort by time and lose their scene", () => {
  const s = score(HTML, { chords: [{ scene: "after", at: 0, until: 2 }, { scene: "title", at: 0, until: 3 }] });
  assert.deepEqual(s.chords.map((c) => [c.t, c.end]), [[0, 3], [7, 9]]);
  assert.ok(!("scene" in s.chords[0]) && !("at" in s.chords[0]) && !("until" in s.chords[0]));
});

test("the score carries the master's canvas, frame rate and length, and sound.json's other keys", () => {
  const s = score(HTML, { key: 73.42, bed: -14 });
  assert.deepEqual([s.canvas, s.fps, s.duration, s.key, s.bed, s.cues], [{ w: 1920, h: 1080 }, 30, 12, 73.42, -14, []]);
});

test("a row in an unknown scene is named", () => {
  assert.throws(() => score(HTML, { cues: [{ id: "hit", kind: "impact", scene: "gone", at: 1 }] }), /hit: no scene "gone"/);
});

const SHORT = score(HTML.replace('data-duration="12"', 'data-duration="4"'), {
  cues: [{ id: "hit", kind: "impact", scene: "chat", at: 0.5, x: 960, y: 540, w: 400, h: 90 }],
  chords: [{ scene: "title", at: 0, until: 3, notes: [62, 66, 69, 74], sub: 50, level: -6 }],
  blooms: [{ scene: "chat", at: 0.5, db: 8 }],
});

test("the pad is a 44.1 kHz stereo WAV the length of the film, the same bytes every time", () => {
  const wav = /** @type {Buffer} */ (pad(SHORT));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.deepEqual([wav.readUInt16LE(22), wav.readUInt32LE(24)], [2, 44100]);
  assert.equal(wav.readUInt32LE(40), 4 * 44100 * 4);
  assert.ok(wav.equals(/** @type {Buffer} */ (pad(SHORT))));
});

test("a score without chords has no pad", () => {
  assert.equal(pad({ ...SHORT, chords: [] }), null);
});

test("the foley is the same bytes every time", () => {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-foley-"));
  writeFileSync(join(dir, "score.json"), JSON.stringify(SHORT));
  const render = (/** @type {string} */ out) => {
    assert.equal(spawnSync(process.execPath, [SHEET, join(dir, "score.json"), "--out", join(dir, out)]).status, 0);
    return readFileSync(join(dir, out));
  };
  assert.ok(render("a.wav").equals(render("b.wav")));
});

/** A copy of a studio, with its studio and the named film opened. @param {string} from @param {string} name */
function studioCopy(from, name) {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-sound-"));
  cpSync(new URL(from, import.meta.url), dir, { recursive: true });
  const studio = openStudio(dir);
  return { dir, studio, film: openFilm(studio, name) };
}

test("a film without sound.json has no sound, and loses the last one", () => {
  const { dir, studio, film } = studioCopy("fixtures/studio", "plain");
  const stale = join(dir, "build/plain/sound.m4a");
  mkdirSync(join(dir, "build/plain"), { recursive: true });
  writeFileSync(stale, "");
  assert.equal(buildSound(studio, film), null);
  assert.ok(!existsSync(stale));
});

test("a sound.json that places nothing fails the sound, and a bed that isn't a number is a usage error", () => {
  const { dir, studio, film } = studioCopy("fixtures/studio", "hook");
  assert.deepEqual(buildSound(studio, film), { built: false, error: "sound.json places no cues or chords, so there's nothing to hear" });
  writeFileSync(join(dir, "films/hook/sound.json"), '{ "bed": "-12" }');
  assert.throws(() => buildSound(studio, film), (e) => e instanceof FilmkitError && /films\/hook\/sound\.json: "bed"/.test(e.message));
});

test("the foley stays dry: sound-sheet never sees the pad's bed, so it is silent until the first cue", { skip: !hasFfmpeg && "no ffmpeg" }, () => {
  const { dir, studio, film } = studioCopy("fixtures/studio", "hook");
  writeFileSync(join(dir, "films/hook/sound.json"), JSON.stringify({ bed: -12, cues: [{ id: "hit", kind: "impact", scene: "title", at: 3, x: 960, y: 540 }] }));
  assert.ok(buildSound(studio, film)?.built);
  const work = join(dir, "build/hook/sound");
  assert.equal(JSON.parse(readFileSync(join(work, "score.json"), "utf8")).bed, -12);
  assert.ok(!("bed" in JSON.parse(readFileSync(join(work, "foley.json"), "utf8"))));
  const foley = readFileSync(join(work, "foley.wav"));
  const data = foley.indexOf("data") + 8;
  const beforeHit = foley.subarray(data, data + Math.floor(2.9 * 44100) * 4);
  assert.ok(beforeHit.every((byte) => byte === 0));
});

test("the smoke film's sound is mastered to −19 LUFS ±0.5 with its hits held near −3 dBTP, and kept while its score holds", { skip: !hasFfmpeg && "no ffmpeg" }, () => {
  const { dir, studio, film } = studioCopy("../examples/studio", "smoke");
  const sound = buildSound(studio, film);
  assert.ok(sound?.built, JSON.stringify(sound));
  const measured = /** @type {{ lufs: number, truePeak: number }} */ (loudness(sound.path));
  assert.ok(Math.abs(measured.lufs + 19) <= 0.5, `${measured.lufs} LUFS`);
  assert.ok(measured.truePeak <= -2.5, `${measured.truePeak} dBTP`);

  const built = statSync(sound.path).mtimeMs;
  assert.deepEqual(buildSound(studio, film), sound);
  assert.equal(statSync(sound.path).mtimeMs, built);

  rmSync(join(dir, "films/smoke/sound.json"));
  assert.equal(buildSound(studio, film), null);
  assert.ok(!existsSync(sound.path));
});
