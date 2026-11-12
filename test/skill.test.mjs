// The filmkit skill loads in Claude Code, Codex and other Agent Skills hosts only when its frontmatter is valid,
// and an agent following it is stranded by a link that doesn't resolve. The research notes are vendored unchanged
// (references/research/NOTICE.md) and keep their upstream links, so only links out of the skill's own files count.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "../skills/filmkit");
const vendoredDir = join(skillDir, "references/research");

/** @param {string} text */
function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([a-z-]+):\s*(.*)$/);
    if (pair) fields[pair[1]] = pair[2];
  }
  return fields;
}

/** @param {string} dir @returns {string[]} */
function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path === vendoredDir ? [] : markdownFiles(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

test("SKILL.md has the Agent Skills frontmatter", () => {
  const fields = frontmatter(readFileSync(join(skillDir, "SKILL.md"), "utf8"));
  assert.ok(fields, "SKILL.md starts with a --- frontmatter block");
  assert.equal(fields.name, "filmkit", "name matches the skill's directory");
  assert.match(fields.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(fields.description, "description is set");
  assert.ok(fields.description.length <= 1024, "description fits the 1024-character limit");
});

test("every relative link in the skill resolves", () => {
  const broken = [];
  for (const file of markdownFiles(skillDir)) {
    const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/.test(target) || target.startsWith("#")) continue;
      const path = resolve(dirname(file), target.split("#")[0]);
      if (!existsSync(path)) broken.push(`${file.slice(skillDir.length + 1)} → ${target}`);
    }
  }
  assert.deepEqual(broken, []);
});
