import { CATALOGUE, fail } from "../../errors.js";

export const usage = "explain [code]";
export const summary = "why an error or check rule exists and how to fix it; with no code, every code";

/** @param {import("../index.js").Context} ctx */
export async function run({ args, log }) {
  const [code] = args;
  if (!code) {
    const codes = Object.keys(CATALOGUE);
    const width = Math.max(...codes.map((c) => c.length));
    for (const c of codes) log(`${c.padEnd(width)}  ${CATALOGUE[c].why.split(/(?<=\.) /)[0]}`);
    return { ok: true, codes };
  }
  const entry = CATALOGUE[code];
  if (!entry) throw fail("unknown_code", { code });
  log(`${code}\n\n${entry.why}`);
  return { ok: true, code, why: entry.why };
}
