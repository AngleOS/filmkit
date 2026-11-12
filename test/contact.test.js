import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { MAX_SIDE, contactTimes, labelCanvas, sheetLayout } from "../src/build/contact.js";
import { SIZES } from "../src/studio.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const FIXTURE = fileURLToPath(new URL("fixtures/studio", import.meta.url));
const EXAMPLES = fileURLToPath(new URL("../examples/studio", import.meta.url));

/** @param {string[]} args @param {string} cwd */
const filmkit = (args, cwd = FIXTURE) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });

/** @param {string} html */
const film = (html) => ({ name: "f", dir: "", html, root: { "data-duration": "10" } });

const MASTER = `<div id="root" data-composition-id="main" data-start="0" data-duration="10">
  <div id="a" data-start="0" data-duration="4"></div>
  <div id="cc" data-start="0" data-duration="10"></div>
  <div id="b" data-start="a" data-duration="0.4"></div>
  <div id="c" data-start="9" data-duration="1"></div>
  <div id="d" data-start="9.9" data-duration="2"></div>
</div>`;

test("with no times, a contact sheet looks just after each scene starts, once per moment", () => {
  assert.deepEqual(contactTimes(film(MASTER), {}), [0.7, 4.2, 9.5]);
});

test("--every steps from 0 to the end, and --at is taken as given", () => {
  assert.deepEqual(contactTimes(film(MASTER), { every: 3 }), [0, 3, 6, 9]);
  assert.deepEqual(contactTimes(film(MASTER), { every: 0.1 }).length, 100);
  assert.deepEqual(contactTimes(film(MASTER), { at: [2, 1] }), [2, 1]);
});

test("every sheet fits inside 2048 px, with the frames as large as that allows", () => {
  for (const [width, height] of Object.values(SIZES)) {
    for (let count = 1; count <= 48; count++) {
      const layout = sheetLayout(count, width, height);
      assert.ok(layout.width <= MAX_SIDE && layout.height <= MAX_SIDE, `${width}x${height} × ${count}`);
      assert.ok(layout.frame.w <= width && Math.abs(layout.frame.w / layout.frame.h - width / height) < 0.01);
      const last = layout.cells[count - 1];
      assert.ok(last.x + layout.frame.w <= layout.width && last.frameY + layout.frame.h <= layout.height);
    }
  }
  assert.deepEqual(sheetLayout(1, 1920, 1080).frame, { w: 1920, h: 1080 });
  assert.deepEqual(sheetLayout(1, 1080, 1920).frame, { w: 1080, h: 1920 });
  assert.deepEqual(sheetLayout(2, 1080, 1920).frame, { w: 1012, h: 1799 });
});

test("the label canvas is a greyscale PGM of the sheet with each label inked inside its own cell", () => {
  const layout = sheetLayout(2, 1920, 1080);
  const pgm = labelCanvas(layout, ["16x9 0.7s", "16x9 12.25s"]);
  const header = `P5\n${layout.width} ${layout.height}\n255\n`;
  assert.equal(pgm.subarray(0, header.length).toString(), header);
  const pixels = pgm.subarray(header.length);
  assert.equal(pixels.length, layout.width * layout.height);
  const inked = (/** @type {{ x: number, y: number }} */ cell) => {
    for (let y = cell.y; y < cell.y + 33; y++) {
      for (let x = cell.x; x < cell.x + layout.frame.w; x++) if (pixels[y * layout.width + x] > 0x80) return true;
    }
    return false;
  };
  assert.ok(layout.cells.every(inked));
});

test("a label too long for its cell keeps the time whole and drops the format", () => {
  const layout = sheetLayout(48, 1080, 1920);
  const only = (/** @type {string} */ label) => labelCanvas({ ...layout, cells: layout.cells.slice(0, 1) }, [label]);
  assert.deepEqual(only("9x16 12.725s"), only("12.725s"));
  assert.notDeepEqual(only("9x16 1s"), only("1s"));
});

test("contact rejects unreadable times before it snapshots anything", () => {
  for (const [args, message] of [
    [["contact", "hook", "--every", "2s", "--at", "1"], /--every or --at, not both/],
    [["contact", "hook", "--every", "soon"], /--every soon: say how often/],
    [["contact", "hook", "--at", "1,x"], /--at 1,x: list times in seconds/],
    [["contact", "hook", "--at", "1,6"], /--at 6: past the end of hook \(6 s\)/],
    [["contact", "hook", "--every", "0.1"], /60 frames is too many for one sheet \(at most 48\)/],
  ]) {
    const { status, stderr } = filmkit(/** @type {string[]} */ (args));
    assert.equal(status, 2, String(args));
    assert.match(stderr, /** @type {RegExp} */ (message));
  }
});

const ffmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
const chrome = ffmpeg && filmkit(["doctor"]).status === 0;

test("contact builds a labelled sheet of the smoke film within 2048 px", { skip: !chrome && "needs ffmpeg and HyperFrames' Chrome (filmkit doctor)" }, () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "filmkit-contact-")));
  cpSync(join(EXAMPLES, "filmkit.json"), join(dir, "filmkit.json"));
  cpSync(join(EXAMPLES, "films/smoke"), join(dir, "films/smoke"), { recursive: true });
  const { status, stdout, stderr } = filmkit(["contact", "smoke", "9x16", "--json"], dir);
  assert.equal(status, 0, stderr);
  const { ok, sheets } = JSON.parse(stdout);
  assert.equal(ok, true);
  assert.deepEqual(sheets.map((/** @type {{ format: string, path: string }} */ s) => [s.format, s.path]), [["9x16", join(dir, "build/smoke/contact-9x16.png")]]);
  assert.deepEqual(sheets[0].times, [0.7, 3.2, 5.7, 8.2, 10.7, 11.2, 13.7, 16.7, 20.2]);
  const png = readFileSync(sheets[0].path);
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  assert.ok(Math.max(width, height) <= MAX_SIDE && Math.max(width, height) > 1500, `${width}×${height}`);
});
