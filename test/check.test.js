import assert from "node:assert/strict";
import { test } from "node:test";
import { findings } from "../src/cli/commands/check.js";

const report = {
  ok: false,
  lint: { findings: [{ code: "subcomposition_blanks_before_host", severity: "warning", message: "blank", selector: "#a", bbox: {} }] },
  layout: { findings: [{ code: "text_box_overflow", severity: "error", message: "overflows", selector: "#src" }] },
  craft: { findings: [{ code: "hint", severity: "info", message: "fyi" }] },
  snapshots: { enabled: false },
};

test("check reports HyperFrames' errors and warnings from every pass, without the info", () => {
  assert.deepEqual(findings({ ok: false, stdout: JSON.stringify(report) }), {
    ok: false,
    errors: [{ code: "text_box_overflow", message: "overflows", selector: "#src" }],
    warnings: [{ code: "subcomposition_blanks_before_host", message: "blank", selector: "#a" }],
  });
});

test("a clean report passes", () => {
  assert.deepEqual(findings({ ok: true, stdout: JSON.stringify({ ok: true, lint: { findings: [] } }) }), { ok: true, errors: [], warnings: [] });
});

test("no report is a failure", () => {
  assert.deepEqual(findings({ ok: false, stdout: "Error: Chrome crashed" }).errors, [
    { code: "no_report", message: "HyperFrames gave no report. See what's missing with: filmkit doctor" },
  ]);
});
