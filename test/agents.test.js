import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";
import { mcpCommand, parseCommand, registerAgents } from "../src/agents/register.js";

const CLI = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const NPX = { command: "npx", args: ["-y", "filmkit", "mcp"] };
const STDIO = { command: "npx", args: ["-y", "filmkit", "mcp"] };

/** @param {string} path @param {string} text */
function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
const read = (/** @type {string} */ path) => readFileSync(path, "utf8");

/**
 * A HOME where every tool is installed, each config already holding someone else's server and a comment where the
 * format allows one. Gemini CLI and opencode are found by their binaries, as stand-in files on the PATH.
 * @param {"darwin" | "linux" | "win32"} platform
 */
function fixtureHome(platform) {
  const home = mkdtempSync(join(tmpdir(), `filmkit-agents-${platform}-`));
  const appConfig = { darwin: join(home, "Library", "Application Support"), linux: join(home, ".config"), win32: join(home, "AppData", "Roaming") }[platform];
  const zed = platform === "win32" ? join(appConfig, "Zed") : join(home, ".config", "zed");
  const files = {
    "claude-desktop": join(appConfig, "Claude", "claude_desktop_config.json"),
    codex: join(home, ".codex", "config.toml"),
    cursor: join(home, ".cursor", "mcp.json"),
    vscode: join(appConfig, "Code", "User", "mcp.json"),
    copilot: join(home, ".copilot", "mcp-config.json"),
    windsurf: join(home, ".codeium", "windsurf", "mcp_config.json"),
    zed: join(zed, "settings.json"),
    gemini: join(home, ".gemini", "settings.json"),
    opencode: join(home, ".config", "opencode", "opencode.json"),
  };
  const other = `{ "command": "other-server", "args": [] }`;
  for (const [id, file] of Object.entries(files)) {
    if (id === "codex") write(file, `model = "o3" # mine\n\n[mcp_servers.other]\ncommand = "other-server"\n`);
    else if (id === "vscode") write(file, `{\n  // mine\n  "servers": {\n    "other": ${other}\n  }\n}\n`);
    else if (id === "zed") write(file, `// Zed settings\n{\n  "theme": "One Dark", // mine\n  "context_servers": {\n    "other": ${other},\n  },\n}\n`);
    else if (id === "opencode") write(file, `{\n  "$schema": "https://opencode.ai/config.json",\n  "mcp": {\n    "other": { "type": "local", "command": ["other-server"] }\n  }\n}\n`);
    else write(file, `{\n  "theme": "mine",\n  "mcpServers": {\n    "other": ${other}\n  }\n}\n`);
  }
  const bin = join(home, "bin");
  // Spelled as PATHEXT has it: Windows matches either case, a case-sensitive file system (CI's Linux) only this one.
  for (const name of ["gemini", "opencode"]) write(join(bin, platform === "win32" ? `${name}.CMD` : name), "");
  /** @type {import("../src/agents/register.js").Host} */
  const host = { home, platform, vars: { PATH: bin, PATHEXT: ".EXE;.CMD" } };
  return { home, host, files };
}

/** @param {string} file @param {string[]} key */
function entry(file, key) {
  if (file.endsWith(".toml")) return read(file).match(/^\[mcp_servers\.filmkit\]\n(?:[^[\n].*\n)*/m)?.[0];
  /** @type {any} */
  let value = parse(read(file), [], { allowTrailingComma: true });
  for (const k of key) value = value?.[k];
  return value;
}

const KEYS = /** @type {Record<string, string[]>} */ ({
  vscode: ["servers", "filmkit"],
  zed: ["context_servers", "filmkit"],
  opencode: ["mcp", "filmkit"],
});

for (const platform of /** @type {const} */ (["darwin", "linux", "win32"])) {
  test(`${platform}: registers in every tool once, keeps the rest of each config, and --remove takes only Filmkit out`, () => {
    const { home, host, files } = fixtureHome(platform);
    const before = Object.fromEntries(Object.entries(files).map(([id, f]) => [id, read(f)]));
    const added = registerAgents({ host, command: NPX, stamp: "1" });
    assert.deepEqual(added.map((t) => [t.id, t.status]), [
      ["claude-code", "skipped"], ["claude-desktop", "configured"], ["codex", "configured"], ["cursor", "configured"],
      ["vscode", "configured"], ["copilot", "configured"], ["windsurf", "configured"], ["zed", "configured"],
      ["gemini", "configured"], ["opencode", "configured"],
    ]);
    const command = platform === "win32" ? { command: "cmd", args: ["/c", "npx", "-y", "filmkit", "mcp"] } : STDIO;
    assert.deepEqual(entry(files["claude-desktop"], ["mcpServers", "filmkit"]), command);
    assert.deepEqual(entry(files.cursor, ["mcpServers", "filmkit"]), { type: "stdio", ...command });
    assert.deepEqual(entry(files.vscode, KEYS.vscode), { type: "stdio", ...command });
    assert.deepEqual(entry(files.copilot, ["mcpServers", "filmkit"]), { type: "stdio", ...command, tools: ["*"] });
    assert.deepEqual(entry(files.zed, KEYS.zed), command);
    assert.deepEqual(entry(files.opencode, KEYS.opencode), { type: "local", command: [command.command, ...command.args], enabled: true });
    assert.equal(entry(files.codex, []), `[mcp_servers.filmkit]\ncommand = "${command.command}"\nargs = ${JSON.stringify(command.args).replaceAll(",", ", ")}\nstartup_timeout_sec = 60\n`);
    for (const [id, file] of Object.entries(files)) {
      assert.equal(read(`${file}.filmkit-backup-1`), before[id], `${id} backup`);
      assert.match(read(file), /other-server/, `${id} keeps the other server`);
    }
    assert.match(read(files.zed), /^\/\/ Zed settings\n[\s\S]*"theme": "One Dark", \/\/ mine\n/);
    assert.match(read(files.vscode), /\/\/ mine/);
    assert.match(read(files.codex), /^model = "o3" # mine\n/);

    const skill = join(home, ".agents", "skills", "filmkit", "SKILL.md");
    assert.match(read(skill), /^name: filmkit$/m);
    assert.deepEqual(added.filter((t) => t.changes.includes(dirname(skill))).map((t) => t.id), ["codex"], "one copy, listed once");

    const again = registerAgents({ host, command: NPX, stamp: "2" });
    for (const t of again.filter((t) => t.status === "configured")) assert.deepEqual([t.changes, t.backups], [[], []], `${t.id} is already set up`);
    assert.ok(registerAgents({ host, command: NPX, dryRun: true }).every((t) => t.changes.length === 0), "a dry run has nothing to do");
    const after = Object.fromEntries(Object.entries(files).map(([id, f]) => [id, read(f)]));

    const removed = registerAgents({ host, command: NPX, remove: true, stamp: "3" });
    assert.deepEqual(removed.filter((t) => t.status === "removed").length, 9);
    for (const [id, file] of Object.entries(files)) {
      assert.equal(read(file), before[id], `${id} is as it was`);
      assert.equal(read(`${file}.filmkit-backup-3`), after[id]);
    }
    assert.ok(!existsSync(dirname(skill)));
    assert.deepEqual(registerAgents({ host, command: NPX, remove: true }).map((t) => t.status), Array(10).fill("skipped"));
  });
}

test("a tool that isn't installed is skipped and nothing is written for it", () => {
  const home = mkdtempSync(join(tmpdir(), "filmkit-agents-empty-"));
  const results = registerAgents({ host: { home, platform: "linux", vars: { PATH: "" } }, command: NPX });
  assert.ok(results.every((t) => t.status === "skipped" && t.detail === "not installed"));
  assert.deepEqual(readdirSync(home), []);
});

test("--dry-run says what it would change and writes nothing", () => {
  const { host, files } = fixtureHome("linux");
  const before = Object.values(files).map(read);
  const planned = registerAgents({ host, command: NPX, dryRun: true });
  assert.ok(planned.filter((t) => t.status !== "skipped").every((t) => t.changes.length > 0));
  assert.deepEqual(Object.values(files).map(read), before);
  assert.ok(!existsSync(join(host.home, ".agents")));
});

test("a config that isn't valid JSON fails that tool alone and stays as it was", () => {
  const { host, files } = fixtureHome("linux");
  write(files.cursor, "{ nope");
  const results = registerAgents({ host, command: NPX, only: ["cursor", "windsurf"] });
  assert.deepEqual(results.map((t) => t.status), ["failed", "configured"]);
  assert.match(results[0].detail ?? "", /mcp\.json isn't valid JSON .*: fix it, then run this again/);
  assert.equal(read(files.cursor), "{ nope");
});

test("an entry is updated in place, and a last member goes with its comma but not its neighbour's comment", () => {
  const { host, files } = fixtureHome("linux");
  write(files.cursor, `{\n  "mcpServers": {\n    "other": { "command": "x" }, // keep\n    "filmkit": { "command": "old" }\n  }\n}\n`);
  registerAgents({ host, command: NPX, only: ["cursor"] });
  assert.deepEqual(entry(files.cursor, ["mcpServers", "filmkit"]), { type: "stdio", ...STDIO });
  assert.match(read(files.cursor), /"other": \{ "command": "x" \}, \/\/ keep\n    "filmkit": \{\n/);
  registerAgents({ host, command: NPX, only: ["cursor"], remove: true });
  assert.equal(read(files.cursor), `{\n  "mcpServers": {\n    "other": { "command": "x" } // keep\n  }\n}\n`);
});

test("Codex: Filmkit's table and its subtables are replaced where they stand, CRLF kept", () => {
  const { host, files } = fixtureHome("win32");
  write(files.codex, `a = 1\r\n\r\n[mcp_servers.filmkit]\r\ncommand = "old"\r\n\r\n[mcp_servers.filmkit.env]\r\nX = "1"\r\n\r\n# next\r\n[b]\r\nc = 2\r\n`);
  registerAgents({ host, command: NPX, only: ["codex"] });
  assert.equal(read(files.codex), `a = 1\r\n\r\n[mcp_servers.filmkit]\r\ncommand = "cmd"\r\nargs = ["/c", "npx", "-y", "filmkit", "mcp"]\r\nstartup_timeout_sec = 60\r\n\r\n# next\r\n[b]\r\nc = 2\r\n`);
  registerAgents({ host, command: NPX, only: ["codex"], remove: true });
  assert.equal(read(files.codex), `a = 1\r\n\r\n# next\r\n[b]\r\nc = 2\r\n`);
});

test("a skills folder named filmkit that isn't Filmkit's is left alone", () => {
  const { home, host } = fixtureHome("linux");
  write(join(home, ".agents", "skills", "filmkit", "SKILL.md"), "---\nname: something-else\n---\n");
  const [codex] = registerAgents({ host, command: NPX, only: ["codex"] });
  assert.equal(codex.status, "failed");
  assert.match(codex.detail ?? "", /isn't Filmkit's skill: move it/);
});

test("Claude Code goes through its CLI at user scope, only when its entry differs, with the skill in ~/.claude/skills", { skip: process.platform === "win32" }, () => {
  const home = mkdtempSync(join(tmpdir(), "filmkit-agents-claude-"));
  const log = join(home, "claude.log");
  const state = join(home, "entry");
  // A stand-in claude: `get` prints the entry the way Claude Code does, and exits 1 when there's none.
  write(join(home, "bin", "claude"), `#!/bin/sh
echo "$*" >> "${log}"
case "$2" in
  get) [ -e "${state}" ] && /bin/cat "${state}" ;;
  remove) [ ! -e "${home}/fail-remove" ] && [ -e "${state}" ] && /bin/rm "${state}" ;;
  add) [ ! -e "${home}/fail" ] && shift 6 && c=$1 && shift &&
    printf 'filmkit:\\n  Scope: User config (available in all your projects)\\n  Command: %s\\n  Args: %s\\n' "$c" "$*" > "${state}" ;;
esac
`);
  chmodSync(join(home, "bin", "claude"), 0o755);
  const host = { home, platform: process.platform, vars: { PATH: join(home, "bin") } };
  const claude = (/** @type {import("../src/agents/register.js").Options} */ options = {}) => registerAgents({ host, command: NPX, only: ["claude-code"], ...options })[0];
  assert.equal(claude().status, "configured");
  assert.equal(read(log), "mcp get filmkit\nmcp remove -s user filmkit\nmcp add -s user filmkit -- npx -y filmkit mcp\n");
  assert.ok(existsSync(join(home, ".claude", "skills", "filmkit", "SKILL.md")));
  assert.deepEqual(claude().changes, [], "already set up");
  assert.deepEqual(claude({ dryRun: true }).changes, []);
  assert.deepEqual(claude({ command: { command: "npx", args: ["-y", "github:AngleOS/filmkit", "mcp"] }, dryRun: true }).changes, ["claude mcp add -s user filmkit -- npx -y github:AngleOS/filmkit mcp"]);
  const removed = claude({ remove: true });
  assert.deepEqual([removed.status, removed.changes], ["removed", ["claude mcp remove -s user filmkit", join(home, ".claude", "skills", "filmkit")]]);
  assert.equal(claude({ remove: true }).status, "skipped");
  write(state, "filmkit:\n  Scope: Project config (shared via .mcp.json)\n  Command: npx\n  Args: -y filmkit mcp\n");
  assert.equal(claude({ remove: true }).status, "skipped", "a project-scope entry isn't Filmkit's to remove");
  write(state, "filmkit:\n  Scope: User config (available in all your projects)\n  Command: npx\n  Args: -y filmkit mcp\n");
  write(join(home, "fail-remove"), "");
  assert.match(claude({ remove: true }).detail ?? "", /^claude mcp remove -s user filmkit failed/);
  rmSync(join(home, "fail-remove"));
  rmSync(state);
  write(join(home, "fail"), "");
  const failed = claude();
  assert.equal(failed.status, "failed");
  assert.match(failed.detail ?? "", /^claude mcp add -s user filmkit -- npx -y filmkit mcp failed/);
});

test("removing one tool keeps the shared skills folder while another tool still has Filmkit", () => {
  const { home, host } = fixtureHome("linux");
  registerAgents({ host, command: NPX, only: ["codex", "cursor"] });
  const skill = join(home, ".agents", "skills", "filmkit");
  const [codex] = registerAgents({ host, command: NPX, only: ["codex"], remove: true });
  assert.deepEqual(codex.changes, [`${join(home, ".codex", "config.toml")} mcp_servers.filmkit`]);
  assert.ok(existsSync(skill));
  registerAgents({ host, command: NPX, only: ["cursor"], remove: true });
  assert.ok(!existsSync(skill));
});

test("Codex: an entry written as an inline table or dotted keys fails the tool instead of becoming a second one", () => {
  const { host, files } = fixtureHome("linux");
  for (const text of [`[mcp_servers]\nfilmkit = { command = "old" }\n`, `mcp_servers.filmkit.command = "old"\n`, `[mcp_servers]\n"filmkit".command = "old"\n`]) {
    write(files.codex, text);
    for (const remove of [false, true]) {
      const [codex] = registerAgents({ host, command: NPX, only: ["codex"], remove });
      assert.equal(codex.status, "failed", text);
      assert.match(codex.detail ?? "", /defines mcp_servers\.filmkit other than as a \[mcp_servers\.filmkit\] table: delete it/);
      assert.equal(read(files.codex), text);
    }
  }
  write(files.codex, `[mcp_servers]\nother = { command = "x" }\n\n[other]\nfilmkit = 1\n`);
  assert.equal(registerAgents({ host, command: NPX, only: ["codex"] })[0].status, "configured");
});

test("a backup never replaces an earlier one, even within the same second", () => {
  const { host, files } = fixtureHome("linux");
  const before = read(files.cursor);
  registerAgents({ host, command: NPX, only: ["cursor"], stamp: "1" });
  registerAgents({ host, command: NPX, only: ["cursor"], stamp: "1", remove: true });
  assert.equal(read(`${files.cursor}.filmkit-backup-1`), before);
  assert.match(read(`${files.cursor}.filmkit-backup-1-2`), /"filmkit"/);
});

test("the server command follows how filmkit was run", () => {
  const checkout = mkdtempSync(join(tmpdir(), "filmkit-checkout-"));
  assert.deepEqual(mcpCommand(checkout), { command: "node", args: [join(checkout, "src", "cli", "index.js"), "mcp"] });
  const npxCache = mkdtempSync(join(tmpdir(), "filmkit-npx-"));
  const lock = (/** @type {string} */ resolved) => write(join(npxCache, "node_modules", ".package-lock.json"), JSON.stringify({ packages: { "node_modules/filmkit": { resolved } } }));
  lock("git+ssh://git@github.com/AngleOS/filmkit.git#2e08116e27ef9ebfa013c5113c325d221d1258eb");
  assert.deepEqual(mcpCommand(join(npxCache, "node_modules", "filmkit")), { command: "npx", args: ["-y", "github:AngleOS/filmkit", "mcp"] });
  lock("https://registry.npmjs.org/filmkit/-/filmkit-0.1.0.tgz");
  assert.deepEqual(mcpCommand(join(npxCache, "node_modules", "filmkit")), { command: "npx", args: ["-y", "filmkit", "mcp"] });
  assert.deepEqual(parseCommand(" npx -y github:AngleOS/filmkit mcp "), { command: "npx", args: ["-y", "github:AngleOS/filmkit", "mcp"] });
  assert.deepEqual(parseCommand(`node "/Users/x/My Projects/filmkit/src/cli/index.js" mcp`), { command: "node", args: ["/Users/x/My Projects/filmkit/src/cli/index.js", "mcp"] });
  assert.deepEqual(parseCommand(`'C:\\Program Files\\nodejs\\node.exe' cli.js mcp`), { command: "C:\\Program Files\\nodejs\\node.exe", args: ["cli.js", "mcp"] });
});

test("filmkit agents: --json, --mcp-command and --dry-run, and an unknown tool is a usage error", () => {
  const { host, files } = fixtureHome(process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux");
  const env = { ...process.env, HOME: host.home, USERPROFILE: host.home, APPDATA: join(host.home, "AppData", "Roaming"), PATH: `${host.vars.PATH}${process.platform === "win32" ? ";" : ":"}${dirname(process.execPath)}` };
  delete env.XDG_CONFIG_HOME;
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [CLI, "agents", ...args], { env, encoding: "utf8" });
  const dry = run(["cursor", "--dry-run", "--json", "--mcp-command", "npx -y github:AngleOS/filmkit mcp"]);
  assert.equal(dry.status, 0, dry.stderr);
  const result = JSON.parse(dry.stdout);
  assert.deepEqual([result.dryRun, result.command.args, result.tools.length], [true, ["-y", "github:AngleOS/filmkit", "mcp"], 1]);
  assert.doesNotMatch(read(files.cursor), /filmkit/);
  const real = run(["cursor"]);
  assert.match(real.stdout, /✓ Cursor {2}configured: ~[/\\].cursor[/\\]mcp\.json mcpServers\.filmkit/);
  const bad = run(["emacs"]);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown agent tool emacs \(tools: claude-code, claude-desktop, codex, cursor, vscode, copilot, windsurf, zed, gemini, opencode\)/);
});
