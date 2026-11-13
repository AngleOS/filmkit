import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOGUE, fail } from "../../errors.js";
import { HYPERFRAMES, pinnedPackage } from "../../hyperframes.js";

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
  const found = CATALOGUE[code] ? { why: CATALOGUE[code].why, source: "filmkit" } : hyperframesWhy(code, pinnedPackage());
  if (!found) throw fail("unknown_code", { code });
  log(`${code}\n\n${found.why}`);
  return { ok: true, code, ...found };
}

/** What each family of HyperFrames' codes checks, for a code its references don't name. */
const FAMILIES = [
  [/^motion_/, "It's one of the motion checks, which hold the film to the assertions in its *.motion.json."],
  [/^(console_error|page_error|request_failed|http_error|runtime_)/, "It's one of the runtime checks, which play the film in Chrome and catch script errors and failed requests."],
  [/(overflow|overlap|occlu|canvas|container|frame|connector|pivot|caption_zone|painted|escapes)/, "It's one of the layout checks, which measure each element's box at sampled times."],
];
const LINT = "It's one of the lint checks, which read the film's HTML before it plays and flag markup, timing and GSAP mistakes.";

/**
 * A HyperFrames rule's why: the paragraph of the pinned version's skill references that names it, else what its
 * family checks. Null when the code isn't one of HyperFrames', or doesn't look like one while HyperFrames isn't
 * fetched yet.
 * @param {string} code
 * @param {string | null} pkg the pinned HyperFrames package
 * @returns {{ why: string, source: "hyperframes-reference" | "hyperframes" } | null}
 */
export function hyperframesWhy(code, pkg) {
  const files = pkg ? readdirSync(join(pkg, "dist"), { recursive: true }).map(String) : [];
  const read = (/** @type {string} */ f) => readFileSync(join(pkg ?? "", "dist", f), "utf8");
  const known = pkg ? files.some((f) => f.endsWith(".js") && read(f).includes(`code: "${code}"`)) : /^[a-z]+(_[a-z0-9]+)+$/.test(code);
  if (!known) return null;
  const said = reference(code, files.filter((f) => f.startsWith("skills") && f.endsWith(".md")), read);
  if (said) return { why: said, source: "hyperframes-reference" };
  const family = FAMILIES.find(([pattern]) => /** @type {RegExp} */ (pattern).test(code))?.[1] ?? LINT;
  return { why: `A ${HYPERFRAMES} rule. Its finding in \`filmkit check\` carries the fix. ${family}`, source: "hyperframes" };
}

/**
 * What the pinned skill references say about a code: the line that defines it (a table row or list item that starts
 * with it) where there is one, else a table row or the first sentence that names it, with the file it's from.
 * @param {string} code
 * @param {string[]} files
 * @param {(file: string) => string} read
 */
function reference(code, files, read) {
  const named = `\`${code}\``;
  /** @type {{ text: string, file: string, defines: boolean }[]} */
  const found = files.flatMap((file) =>
    read(file).split("\n").filter((l) => l.includes(named)).map((l) => {
      const line = l.trim();
      return { text: line, file, defines: line.replace(/^[|*-]\s*/, "").startsWith(named) };
    }),
  );
  const best = found.find((f) => f.defines) ?? found.find((f) => f.text.startsWith("|")) ?? found[0];
  if (!best) return null;
  const cells = best.text.startsWith("|") ? best.text.split("|").map((c) => c.trim()).filter(Boolean) : null;
  const text = cells
    ? (best.defines ? cells.slice(1) : cells).join(": ")
    : best.text.replace(/^[-*]\s+/, "").split(/(?<=\.)\s+(?=[A-Z])/).find((sentence) => sentence.includes(named)) ?? best.text;
  return `${text.replace(/([^.])$/, "$1.")} (HyperFrames' ${best.file.replace(/^skills\//, "")})`;
}
