import { readFileSync } from "node:fs";
import { fail } from "./errors.js";

/**
 * A JSON file's value. A syntax error is the catalogue's `code`, with the error and the line and column it's at.
 * @param {string} file
 * @param {string} code
 * @param {import("./errors.js").Params} [params] the code's other parameters
 * @returns {any}
 */
export function readJson(file, code, params = {}) {
  const text = readFileSync(file, "utf8");
  try {
    return JSON.parse(text);
  } catch (e) {
    const { message } = /** @type {Error} */ (e);
    const position = +(message.match(/at position (\d+)/)?.[1] ?? text.length);
    const before = text.slice(0, position).split("\n");
    const error = message.replace(/ in JSON at position.*/, "").replace(/\.$/, "");
    throw fail(code, { ...params, error, at: `${file}:${before.length}:${before[before.length - 1].length + 1}` });
  }
}
