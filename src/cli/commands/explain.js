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
  [/^(console_error|page_error|request_failed|http_error|runtime_|check_runtime_)/, "It's one of the runtime checks, which play the film in Chrome and catch script errors and failed requests."],
  [/(overflow|overlap|occlu|canvas|container|frame|connector|pivot|caption_zone|painted|escapes)/, "It's one of the layout checks, which measure each element's box at sampled times."],
];
const LINT = "It's one of the lint checks, which read the film's HTML before it plays and flag markup, timing and GSAP mistakes.";

/**
 * A HyperFrames rule's why: what the pinned version's skill references say about it, else what its family checks.
 * Null when the code isn't one of HyperFrames', or doesn't look like one while HyperFrames isn't fetched yet.
 * @param {string} code
 * @param {string | null} pkg the pinned HyperFrames package
 * @returns {{ why: string, source: "hyperframes-reference" | "hyperframes" } | null}
 */
export function hyperframesWhy(code, pkg) {
  if (!pkg) return /^[a-z]+(_[a-z0-9]+)+$/.test(code) ? family(code) : null;
  const files = readdirSync(join(pkg, "dist"), { recursive: true }).map(String);
  const read = (/** @type {string} */ f) => readFileSync(join(pkg, "dist", f), "utf8");
  // The references are small, so they're read first; the 24 MB of code only for a code they don't explain.
  const said = reference(code, files.filter((f) => f.startsWith("skills") && f.endsWith(".md")), read);
  if (said) return { why: said, source: "hyperframes-reference" };
  // HyperFrames writes a code as a finding's `code: "x"`, minified as `code:"x"`, or as a helper's argument: quoted, always.
  const quoted = `"${code}"`;
  return files.some((f) => f.endsWith(".js") && read(f).includes(quoted)) ? family(code) : null;
}

/** @param {string} code */
function family(code) {
  const checks = FAMILIES.find(([pattern]) => /** @type {RegExp} */ (pattern).test(code))?.[1] ?? LINT;
  return { why: `A ${HYPERFRAMES} rule. Its finding in \`filmkit check\` carries the fix. ${checks}`, source: /** @type {const} */ ("hyperframes") };
}

/**
 * What the pinned skill references say about a code, with the file it's from: the line that defines it (a table row
 * or list item that starts with it), else a table row that names it, else a sentence about it, where it's what fails
 * or warns, or what a colon explains. A passing mention (an opt-out that silences it) doesn't explain it.
 * @param {string} code
 * @param {string[]} files
 * @param {(file: string) => string} read
 */
function reference(code, files, read) {
  const named = `\`${code}\``;
  const about = new RegExp(`\\b(fails|warns|flags|reports)( with)? ${named}|${named}:`);
  /** @type {{ text: string, file: string, defines: boolean, row: boolean }[]} */
  const found = files.flatMap((file) =>
    read(file).split("\n").filter((l) => l.includes(named)).map((l) => {
      const text = l.trim();
      return { text, file, defines: text.replace(/^[|*-]\s*/, "").startsWith(named), row: text.startsWith("|") };
    }),
  );
  const best = found.find((f) => f.defines) ?? found.find((f) => f.row);
  if (best?.row) {
    const cells = best.text.split("|").map((c) => c.trim()).filter(Boolean);
    return cite((best.defines ? cells.slice(1) : cells).join(": "), best.file);
  }
  if (best) return cite(best.text.replace(/^[-*]\s+/, ""), best.file);
  for (const { text, file } of found) {
    const sentence = text.replace(/^[-*]\s+/, "").split(/(?<=\.)\s+(?=[A-Z])/).find((s) => about.test(s));
    if (sentence) return cite(sentence, file);
  }
  return null;
}

/** @param {string} text @param {string} file */
const cite = (text, file) => `${text.replace(/([^.])$/, "$1.")} (HyperFrames' ${file.replace(/^skills\//, "")})`;
