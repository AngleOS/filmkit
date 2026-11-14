// The kit's scene catalogue, read from the scenes themselves: each scene's first comment says what it does, and its
// root's data-composition-variables declare what a film can set. `filmkit scenes` and the MCP's list_scenes print it.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { startTags } from "./build/html.js";
import { fail } from "./errors.js";
import { PACKAGE } from "./studio.js";

const SCENES = join(PACKAGE, "kit", "scenes");

/**
 * @typedef {{ id: string, type: string, label: string, default: unknown, options?: { value: string, label: string }[] }} Variable
 * @typedef {{ name: string, description: string, variables: Variable[] }} Scene
 */

/**
 * Every kit scene, by name, or only the one named.
 * @param {string} [name]
 * @returns {Scene[]}
 */
export function sceneCatalogue(name) {
  const names = readdirSync(SCENES).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)).sort();
  if (name !== undefined && !names.includes(name)) throw fail("no_scene", { scene: name, scenes: names });
  return names.filter((n) => name === undefined || n === name).map(readScene);
}

/** @param {string} name @returns {Scene} */
function readScene(name) {
  const html = readFileSync(join(SCENES, `${name}.html`), "utf8");
  const comment = /<!--([\s\S]*?)-->/.exec(html)?.[1] ?? "";
  const root = startTags(html).find((t) => t.attrs["data-composition-id"] === name);
  const variables = JSON.parse(root?.attrs["data-composition-variables"] ?? "[]");
  return { name, description: comment.replace(/\s+/g, " ").trim(), variables };
}

/**
 * docs/scenes.md: the catalogue as a page, so the docs can't drift from the scenes (`npm run docs` writes it, and a
 * test fails when it's stale).
 * @returns {string}
 */
export function scenesMarkdown() {
  const scenes = sceneCatalogue();
  return [
    "# Scenes",
    "",
    "<!-- Generated from kit/scenes/ by `npm run docs`: edit the scenes, not this page. -->",
    "",
    "The kit's scenes, each read from its own comment and `data-composition-variables`, as `filmkit scenes <name>` prints",
    "them. A film mounts a scene with `data-composition-src` and sets its variables with `data-variable-values`; a",
    "variable it leaves out keeps its default:",
    "",
    "```html",
    `<div id="compare" data-composition-id="compare" data-composition-src="kit/scenes/bars.html" data-start="2.8"`,
    `  data-duration="4.4" data-track-index="1" data-track-kind="graphics"`,
    `  data-variable-values='{"data":"2024: 2\\n2025: 3\\n2026: 5","highlight":"2026"}'></div>`,
    "```",
    "",
    scenes.map((s) => `[\`${s.name}\`](#${s.name})`).join(" · "),
    "",
    ...scenes.flatMap(sceneSection),
  ].join("\n");
}

/** @param {Scene} scene */
function sceneSection(scene) {
  return [`## ${scene.name}`, prose(scene.description), "", ...scene.variables.flatMap(variableItem), ""];
}

/** A scene's own words as Markdown: its `code` stays code, and a bare <film> would read as an HTML tag. @param {string} text */
const prose = (text) => text.split("`").map((part, i) => (i % 2 ? part : part.replaceAll("<", "&lt;"))).join("`");

/** One list item a variable; a multi-line default goes in a block under it, where its lines read as they do on screen. @param {Variable} v */
function variableItem(v) {
  const text = typeof v.default === "string" && v.default.includes("\n");
  const head = `- \`${v.id}\` (${v.type}${text ? "" : `, default \`${JSON.stringify(v.default)}\``}): ${prose(v.label)}`;
  const options = v.options ? [`  - one of ${v.options.map((o) => `\`${o.value}\` (${prose(o.label)})`).join(", ")}`] : [];
  const block = text ? ["", "  Default:", "  ```", ...String(v.default).split("\n").map((l) => `  ${l}`), "  ```", ""] : [];
  return [head, ...options, ...block];
}
