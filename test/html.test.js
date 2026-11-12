import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rootTag, setRootSize, startTags } from "../src/build/html.js";

const hook = readFileSync(new URL("fixtures/studio/films/hook/index.html", import.meta.url), "utf8");

test("the root is the main composition, not a comment or a script that names it", () => {
  const root = rootTag(hook).attrs;
  assert.equal(root.id, "root");
  assert.equal(root["data-formats"], "9x16");
  assert.equal(root["data-loop"], "true");
});

test("attribute values are decoded, in any quoting", () => {
  const title = startTags(hook).find((t) => t.attrs.id === "title");
  assert.deepEqual(JSON.parse(title?.attrs["data-variable-values"] ?? ""), { text: "A & B > C" });
  assert.deepEqual(rootTag(`<div data-composition-id='main' data-width=1920>`).attrs, { "data-composition-id": "main", "data-width": "1920" });
});

test("a page with no main composition is an error", () => {
  assert.throws(() => rootTag(`<div data-composition-id="title"></div>`), /no data-composition-id="main" root/);
});

test("setRootSize sizes the root and leaves the rest of the page alone", () => {
  const sized = setRootSize(hook, 1080, 1350);
  assert.equal(rootTag(sized).attrs["data-width"], "1080");
  assert.equal(rootTag(sized).attrs["data-height"], "1350");
  assert.equal(sized.replace(/data-width="1080" data-height="1350"/, 'data-width="1920" data-height="1080"'), hook);
});

test("setRootSize adds a size the root doesn't declare", () => {
  assert.equal(
    setRootSize(`<div data-composition-id="main" data-width=640>`, 1080, 1920),
    `<div data-composition-id="main" data-width="1080" data-height="1920">`,
  );
});

test("a malformed tag with many attributes is read in linear time", () => {
  const tag = `<div ${Array.from({ length: 40 }, (_, i) => `data-a${i}="${i}"`).join(" ")} data-duration= >`;
  const start = performance.now();
  startTags(tag);
  assert.ok(performance.now() - start < 200);
});
