// init makes a studio and new makes films in it from templates/. Whether each template passes `hyperframes check` needs
// Chrome, so CI's film job checks them; these tests hold what's offline: the files, the placeholders and the errors.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { rootTag, startTags } from "../src/build/html.js";
import { initStudio, installSkills, newFilm, templates } from "../src/create.js";
import { openFilm, openStudio, RequirementError } from "../src/studio.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
/** The package root: a template's kit/… paths are the package's own kit/ in a build. */
const PACKAGE = fileURLToPath(new URL("../", import.meta.url));

/** @param {string[]} args @param {string} cwd */
const filmkit = (args, cwd) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
const empty = () => mkdtempSync(join(tmpdir(), "filmkit-create-"));

/** A fresh studio for `name`. @param {string} [name] */
function studio(name = "Acme") {
  const dir = join(empty(), "acme-films");
  initStudio(dir, name);
  return openStudio(dir);
}

test("init makes a studio that opens, with its smoke film, ledgers, agent pointer and skill", () => {
  const dir = join(empty(), "acme-films");
  const { studio: root, name, files, kept } = initStudio(dir);
  assert.equal(name, "acme-films");
  assert.deepEqual(kept, []);
  const made = files.map((f) => f.slice(root.length + 1)).sort();
  assert.deepEqual(made, [".claude/skills/filmkit", ".gitignore", "AGENTS.md", "CLAIMS.md", "POSTING.md", "brand/logo.svg", "filmkit.json", "films/smoke"]);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "filmkit.json"), "utf8")), { name: "acme-films", formats: ["16x9", "9x16", "1x1", "4x5"], theme: "default" });
  assert.equal(readFileSync(join(dir, ".gitignore"), "utf8"), "build/\nrenders/\n");
  assert.ok(existsSync(join(dir, ".claude/skills/filmkit/SKILL.md")));
  assert.match(readFileSync(join(dir, "AGENTS.md"), "utf8"), /\.claude\/skills\/filmkit\/SKILL\.md/);
  for (const file of ["AGENTS.md", "CLAIMS.md", "POSTING.md"]) assert.doesNotMatch(readFileSync(join(dir, file), "utf8"), /\{\{/, file);
  const opened = openStudio(dir);
  assert.equal(opened.name, "acme-films");
  const example = openFilm(openStudio(join(PACKAGE, "examples", "studio")), "smoke");
  assert.equal(openFilm(opened, "smoke").root["data-duration"], example.root["data-duration"]);
});

test("init keeps what's already there and adds only the .gitignore lines it lacks", () => {
  const dir = empty();
  writeFileSync(join(dir, "AGENTS.md"), "# Ours\n");
  writeFileSync(join(dir, ".gitignore"), "node_modules/\nbuild");
  const { files, kept } = initStudio(dir, "Acme");
  assert.deepEqual(kept, [join(dir, "AGENTS.md")]);
  assert.ok(files.includes(join(dir, ".gitignore")));
  assert.equal(readFileSync(join(dir, "AGENTS.md"), "utf8"), "# Ours\n");
  assert.equal(readFileSync(join(dir, ".gitignore"), "utf8"), "node_modules/\nbuild\nrenders/\n");
});

test("init won't make a studio over another one", () => {
  const dir = empty();
  initStudio(dir);
  assert.throws(() => initStudio(dir), { code: "studio_exists", message: /is already a studio\. Make a film in it with: filmkit new <film>/ });
});

test("the film templates are statement and poster", () => {
  assert.deepEqual(templates(), ["poster", "statement"]);
});

for (const template of templates()) {
  test(`new --template ${template}: a film with the brand filled in, built only from kit scenes, its placeholders ⚑ in CLAIMS.md`, () => {
    const s = studio();
    const { files } = newFilm(s, "launch", template);
    const dir = join(s.dir, "films", "launch");
    assert.deepEqual(files, [join(dir, "brief.md"), join(dir, "index.html"), join(s.dir, "CLAIMS.md")]);
    const html = readFileSync(join(dir, "index.html"), "utf8");
    const brief = readFileSync(join(dir, "brief.md"), "utf8");
    for (const text of [html, brief]) assert.doesNotMatch(text, /\{\{/);
    assert.match(brief, /^# Brief: launch\n/);
    assert.match(html, /Acme, in one \*line\.\*/);
    assert.equal(openFilm(s, "launch").root["data-composition-id"], "main");
    for (const tag of startTags(html).filter((t) => t.attrs["data-composition-src"])) {
      assert.ok(existsSync(join(PACKAGE, tag.attrs["data-composition-src"])), tag.source);
      assert.match(tag.attrs["data-start"], /^[\d.]+$/, "numeric starts: chained relative ones lint noisily");
      if (tag.attrs["data-variable-values"]) JSON.parse(tag.attrs["data-variable-values"]);
    }
    const claims = readFileSync(join(s.dir, "CLAIMS.md"), "utf8");
    const section = claims.slice(claims.indexOf("\n## launch\n"));
    const rows = section.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| On screen"));
    assert.ok(rows.length && rows.every((r) => r.includes("⚑ placeholder")), section);
    assert.match(section, /\| Acme, in one line\. \|/);
  });
}

test("new fills in a brand name that needs escaping, and the scene variables still parse", () => {
  const s = studio(`Jo's "Q&A" <Co>`);
  newFilm(s, "teaser", "statement");
  const html = readFileSync(join(s.dir, "films/teaser/index.html"), "utf8");
  const promise = startTags(html).find((t) => t.attrs.id === "promise");
  assert.equal(JSON.parse(promise?.attrs["data-variable-values"] ?? "").text, `Jo's "Q&A" <Co>, in one *line.*`);
  assert.equal(rootTag(html).attrs["data-duration"], "12");
});

test("new says what's wrong with the name, the template or an existing film", () => {
  const s = studio();
  newFilm(s, "launch", "statement");
  assert.throws(() => newFilm(s, undefined, "statement"), { code: "new_unnamed" });
  assert.throws(() => newFilm(s, "Launch Film", "statement"), { code: "bad_film_name", fix: "filmkit new launch-film" });
  assert.throws(() => newFilm(s, "x", "documentary"), { code: "unknown_template", message: /no template called "documentary"\. Templates: poster, statement\./ });
  assert.throws(() => newFilm(s, "launch", "poster"), { code: "film_exists", message: /^films\/launch already exists\./ });
  assert.throws(() => newFilm(s, "smoke", "poster"), { code: "film_exists" });
});

test("the CLI: init then new, with --json results, statement by default, and usage errors exiting 2", () => {
  const parent = empty();
  const init = filmkit(["init", "acme-films", "--name", "Acme", "--json"], parent);
  assert.equal(init.status, 0, init.stderr);
  const made = JSON.parse(init.stdout);
  assert.equal(made.ok, true);
  assert.equal(made.name, "Acme");
  assert.match(init.stderr, /Next: cd acme-films && npx filmkit check smoke/);
  const dir = join(parent, "acme-films");
  const film = filmkit(["new", "hello", "--json"], join(dir, "films"));
  assert.equal(film.status, 0, film.stderr);
  const result = JSON.parse(film.stdout);
  assert.deepEqual([result.film, result.template], ["hello", "statement"]);
  assert.ok(result.files.every((/** @type {string} */ f) => f.startsWith(made.studio)));
  assert.deepEqual(readdirSync(join(dir, "films/hello")).sort(), ["brief.md", "index.html"]);
  assert.equal(filmkit(["new", "hello"], dir).status, 2);
  assert.equal(filmkit(["init", "."], dir).status, 2);
});

/** A stand-in for the pinned package's dist/skills: two skills and a folder that isn't one. */
function hyperframesSkills() {
  const dir = empty();
  for (const name of ["hyperframes", "media-use"]) {
    mkdirSync(join(dir, name, "references"), { recursive: true });
    writeFileSync(join(dir, name, "SKILL.md"), `---\nname: ${name}\n---\n`);
    writeFileSync(join(dir, name, "references", "a.md"), "a\n");
  }
  mkdirSync(join(dir, "notes"));
  return dir;
}

test("skills installs the filmkit skill and the pinned HyperFrames skills, replacing old copies and keeping the studio's own", () => {
  const acme = studio();
  const skills = join(acme.dir, ".claude", "skills");
  mkdirSync(join(skills, "hyperframes"), { recursive: true });
  writeFileSync(join(skills, "hyperframes", "stale.md"), "from an older pin\n");
  mkdirSync(join(skills, "ours"));
  writeFileSync(join(skills, "ours", "SKILL.md"), "ours\n");
  const agents = readFileSync(join(acme.dir, "AGENTS.md"), "utf8");
  const { skills: installed, files } = installSkills(acme, hyperframesSkills());
  assert.deepEqual(installed.map((s) => [s.name, s.from, s.path]), [
    ["filmkit", "filmkit", join(skills, "filmkit")],
    ["hyperframes", "hyperframes@0.8.186", join(skills, "hyperframes")],
    ["media-use", "hyperframes@0.8.186", join(skills, "media-use")],
  ]);
  assert.ok(existsSync(join(skills, "filmkit", "SKILL.md")));
  assert.ok(existsSync(join(skills, "media-use", "references", "a.md")));
  assert.ok(!existsSync(join(skills, "hyperframes", "stale.md")));
  assert.ok(!existsSync(join(skills, "notes")));
  assert.equal(readFileSync(join(skills, "ours", "SKILL.md"), "utf8"), "ours\n");
  // init's AGENTS.md already points to the HyperFrames skill, so only .gitignore changes
  assert.deepEqual(files, [join(acme.dir, ".gitignore")]);
  assert.equal(readFileSync(join(acme.dir, "AGENTS.md"), "utf8"), agents);
  assert.equal(readFileSync(join(acme.dir, ".gitignore"), "utf8"), "build/\nrenders/\n.claude/skills/hyperframes/\n.claude/skills/media-use/\n");
  assert.deepEqual(installSkills(acme, hyperframesSkills()).files, []);
});

test("skills points an AGENTS.md without a pointer at the skills, and writes one when there's none", () => {
  const acme = studio();
  const agents = join(acme.dir, "AGENTS.md");
  writeFileSync(agents, "# Ours");
  installSkills(acme, hyperframesSkills());
  assert.match(readFileSync(agents, "utf8"), /^# Ours\n\n## Skills\n\nRead `\.claude\/skills\/filmkit\/SKILL\.md`[\s\S]*`\.claude\/skills\/hyperframes\/SKILL\.md`/);
  rmSync(agents);
  installSkills(acme, hyperframesSkills());
  assert.match(readFileSync(agents, "utf8"), /^## Skills\n/);
  assert.throws(() => installSkills(acme, empty()), (e) => e instanceof RequirementError && e.code === "hyperframes_no_skills");
});
