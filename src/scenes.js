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
