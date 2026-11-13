import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fail } from "../../errors.js";
import { PACKAGE } from "../../studio.js";

export const usage = "prompt";
export const summary = "the prompt that has your agent install Filmkit and set it up with your brand, to paste into it";

const GUIDE = join(PACKAGE, "docs", "install-with-your-agent.md");

/**
 * The guide's fenced block is the prompt; the page around it is for people. A checkout made with Windows line endings
 * reads the same.
 * @param {string} [page] @param {string} [path] for the error
 */
export function agentPrompt(page = readFileSync(GUIDE, "utf8"), path = GUIDE) {
  const block = page.replaceAll("\r\n", "\n").match(/^````text\n([\s\S]*?)^````$/m)?.[1];
  if (block === undefined) throw fail("prompt_missing", { page: path });
  return block.trimEnd();
}

/** @param {import("../index.js").Context} ctx */
export async function run({ json }) {
  const prompt = agentPrompt();
  // The prompt itself is the output, so with --json it's in the result rather than printed twice.
  if (!json) console.log(prompt);
  return { ok: true, prompt };
}
