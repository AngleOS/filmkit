// CLAIMS.md, the ledger of every word a film shows: a `## <film>` section per film, each with a table of what's on
// screen, its kind and its source (skills/filmkit/references/claims.md). A source that starts with ⚑ isn't true yet,
// and holds back posting the film.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FLAG = "⚑";
const HEADER = "| On screen | Kind | Source |\n|---|---|---|";

/**
 * @typedef {{ film: string, line: string, kind: string, source: string, flag: boolean }} Claim  `source` without its ⚑
 */

/**
 * Every row of the studio's CLAIMS.md, or only the film's.
 * @param {import("./studio.js").Studio} studio
 * @param {string} [film]
 * @returns {Claim[]}
 */
export function readClaims(studio, film) {
  /** @type {Claim[]} */
  const rows = [];
  let section = "";
  for (const text of claimsText(studio).split(/\r?\n/)) {
    section = text.match(/^## (.+?)\s*$/)?.[1] ?? section;
    const cells = text.startsWith("|") ? cellsOf(text) : [];
    if (cells.length !== 3 || cells[0] === "On screen" || /^-+$/.test(cells[0])) continue;
    const [line, kind, source] = cells;
    const flag = source.startsWith(FLAG);
    rows.push({ film: section, line, kind, source: flag ? source.slice(FLAG.length).trim() : source, flag });
  }
  return film === undefined ? rows : rows.filter((r) => r.film === film);
}

/**
 * Appends a row to the film's table, after its last row, or in a new section at the end when the film has none.
 * @param {import("./studio.js").Studio} studio
 * @param {Omit<Claim, "flag"> & { flag?: boolean }} claim
 */
export function addClaim(studio, { film, line, kind, source, flag = false }) {
  const row = `| ${[line, kind, `${flag ? `${FLAG} ` : ""}${source}`].map(cell).join(" | ")} |`;
  const lines = claimsText(studio).replace(/\n*$/, "").split("\n");
  const start = lines.findIndex((l) => l.trimEnd() === `## ${film}`);
  const end = start < 0 ? -1 : lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (start < 0) lines.push("", `## ${film}`, "", HEADER, row);
  else {
    const section = lines.slice(start, end < 0 ? undefined : end);
    const last = section.findLastIndex((l) => l.startsWith("|"));
    // A section with no table yet gets one after its note.
    if (last < 0) lines.splice(start + section.findLastIndex((l) => l.trim()) + 1, 0, "", HEADER, row);
    else lines.splice(start + last + 1, 0, row);
  }
  writeFileSync(join(studio.dir, "CLAIMS.md"), lines.join("\n") + "\n");
}

/** @param {import("./studio.js").Studio} studio */
function claimsText(studio) {
  const path = join(studio.dir, "CLAIMS.md");
  return existsSync(path) ? readFileSync(path, "utf8") : "# Claims\n";
}

/** A table row's cells, split at each | that isn't escaped. @param {string} row */
const cellsOf = (row) => row.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replaceAll("\\|", "|"));

/** Text for a cell: a | escaped, and on one line. @param {string} text */
const cell = (text) => text.replace(/\s*\n\s*/g, " ").trim().replaceAll("|", "\\|");
