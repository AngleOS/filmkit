import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { addClaim, readClaims } from "../src/claims.js";

const LEDGER = `# Claims

## launch

The capability lines are word for word.

| On screen | Kind | Source |
|---|---|---|
| Your inbox, sorted. | claim | homepage H1 |
| Later · Archive \\| Snooze | UI | \`app/src/inbox/actions.ts\` |
| Share it with your team. | claim | ⚑ team sharing ships in 2.0 |

## teaser

Nothing on screen yet.

## hook

| On screen | Kind | Source |
|---|---|---|
| Films are code. | claim | README |
`;

/** A studio with only a CLAIMS.md, which is all the claims need. @param {string} [text] */
function studio(text = LEDGER) {
  const dir = mkdtempSync(join(tmpdir(), "filmkit-claims-"));
  writeFileSync(join(dir, "CLAIMS.md"), text);
  return /** @type {import("../src/studio.js").Studio} */ ({ dir });
}

const claims = (/** @type {{ dir: string }} */ s) => readFileSync(join(s.dir, "CLAIMS.md"), "utf8");

test("every row comes with its film, and a ⚑ source is a flag", () => {
  assert.deepEqual(readClaims(studio()), [
    { film: "launch", line: "Your inbox, sorted.", kind: "claim", source: "homepage H1", flag: false },
    { film: "launch", line: "Later · Archive | Snooze", kind: "UI", source: "`app/src/inbox/actions.ts`", flag: false },
    { film: "launch", line: "Share it with your team.", kind: "claim", source: "team sharing ships in 2.0", flag: true },
    { film: "hook", line: "Films are code.", kind: "claim", source: "README", flag: false },
  ]);
  assert.deepEqual(readClaims(studio(), "hook").map((r) => r.line), ["Films are code."]);
});

test("a row goes after the film's last row, and reads back as it was given", () => {
  const s = studio();
  addClaim(s, { film: "launch", line: "Snooze | Later", kind: "UI", source: "ships in 2.1", flag: true });
  assert.match(claims(s), /\| Share it with your team\. \| claim \| ⚑ team sharing ships in 2\.0 \|\n\| Snooze \\\| Later \| UI \| ⚑ ships in 2\.1 \|\n\n## teaser/);
  assert.deepEqual(readClaims(s, "launch").at(-1), { film: "launch", line: "Snooze | Later", kind: "UI", source: "ships in 2.1", flag: true });
});

test("a film's first row starts its table after its note, or its section at the end", () => {
  const s = studio();
  addClaim(s, { film: "teaser", line: "Soon.", kind: "claim", source: "brief.md" });
  assert.match(claims(s), /Nothing on screen yet\.\n\n\| On screen \| Kind \| Source \|\n\|---\|---\|---\|\n\| Soon\. \| claim \| brief\.md \|\n\n## hook/);
  addClaim(s, { film: "outro", line: "Bye.", kind: "cta", source: "site" });
  assert.ok(claims(s).endsWith("| README |\n\n## outro\n\n| On screen | Kind | Source |\n|---|---|---|\n| Bye. | cta | site |\n"));
  assert.deepEqual(readClaims(s).map((r) => r.film), ["launch", "launch", "launch", "teaser", "hook", "outro"]);
});
