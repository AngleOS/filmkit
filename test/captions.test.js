import assert from "node:assert/strict";
import { test } from "node:test";
import { captionLines, sceneStarts, srt, vtt } from "../src/build/captions.js";

const HTML = `
<div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1920" data-height="1080">
  <div id="chat" data-composition-id="chat" data-composition-src="kit/scenes/chat.html" data-start="2.5" data-duration="4"></div>
  <div id="captions" data-composition-id="captions" data-composition-src="kit/scenes/captions.html" data-start="chat + 0.5" data-duration="5" data-track-index="4" data-track-kind="captions" data-variable-values='{"lines":"1.25-2.4 Write a villain&apos;s monologue\\n0-1 Keep your X-\\u2060Request-\\u2060Id.\\nnot a caption"}'></div>
</div>
`;

test("caption lines are read in the film's time, in order, without word joiners", () => {
  assert.deepEqual(captionLines(HTML), [
    { start: 7, end: 8, text: "Keep your X-Request-Id." },
    { start: 8.25, end: 9.4, text: "Write a villain's monologue" },
  ]);
});

test("a film with no captions host has no caption lines", () => {
  assert.deepEqual(captionLines(HTML.replace("kit/scenes/captions.html", "kit/scenes/title.html")), []);
});

test("starts resolve after another clip, with an offset either way", () => {
  const starts = sceneStarts(`<div data-composition-id="main">
    <div id="a" data-start="1" data-duration="2"></div>
    <div id="b" data-start="a" data-duration="3"></div>
    <div id="c" data-start="b - 0.5" data-duration="1"></div>`);
  assert.deepEqual(starts, { a: { start: 1, duration: 2 }, b: { start: 3, duration: 3 }, c: { start: 5.5, duration: 1 } });
});

test("a start after a missing or circular clip is an error", () => {
  assert.throws(() => sceneStarts(`<div id="a" data-start="nope + 1"></div>`), /no clip "nope" to start from/);
  assert.throws(() => sceneStarts(`<div id="a" data-start="b"></div><div id="b" data-start="a"></div>`), /start of "a" is circular/);
});

test("SRT and VTT stamp hours, minutes, seconds and milliseconds", () => {
  const lines = [{ start: 7, end: 8, text: "One" }, { start: 3725.5, end: 3726.005, text: "Two" }];
  assert.equal(srt(lines), "1\n00:00:07,000 --> 00:00:08,000\nOne\n\n2\n01:02:05,500 --> 01:02:06,005\nTwo\n");
  assert.equal(vtt(lines), "WEBVTT\n\n00:00:07.000 --> 00:00:08.000\nOne\n\n01:02:05.500 --> 01:02:06.005\nTwo\n");
});
