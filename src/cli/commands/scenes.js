import { sceneCatalogue } from "../../scenes.js";

export const usage = "scenes [name]";
export const summary = "the kit's scenes and what each does; with a name, its variables, their defaults and options";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, log }) {
  const scenes = sceneCatalogue(args[0]);
  if (args[0] === undefined) {
    const width = Math.max(...scenes.map((s) => s.name.length));
    for (const s of scenes) log(`${s.name.padEnd(width)}  ${firstSentence(s.description)}`);
    log("Next: filmkit scenes <name> for its variables");
  } else {
    const [scene] = scenes;
    log(`${scene.name}: ${scene.description}\n`);
    const width = Math.max(...scene.variables.map((v) => v.id.length));
    for (const v of scene.variables) {
      log(`  ${v.id.padEnd(width)}  ${v.type}, default ${JSON.stringify(v.default)}: ${v.label}`);
      if (v.options) log(`  ${"".padEnd(width)}  one of ${v.options.map((o) => o.value).join(", ")}`);
    }
  }
  return { ok: true, scenes };
}

/** @param {string} text */
const firstSentence = (text) => /^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
