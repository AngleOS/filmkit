import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGE } from "../../studio.js";

export const usage = "prompt";
export const summary = "the prompt that has your agent install Filmkit and set it up with your brand, to paste into it";

/** The guide's fenced block is the prompt; the page around it is for people. */
export function agentPrompt(page = readFileSync(join(PACKAGE, "docs", "install-with-your-agent.md"), "utf8")) {
  return /** @type {string} */ (page.match(/^````text\n([\s\S]*?)^````$/m)?.[1]).trimEnd();
}

/** @param {import("../index.js").Context} ctx */
export async function run({ json }) {
  const prompt = agentPrompt();
  // The prompt itself is the output, so with --json it's in the result rather than printed twice.
  if (!json) console.log(prompt);
  return { ok: true, prompt };
}
