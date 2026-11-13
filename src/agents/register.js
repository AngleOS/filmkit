// Registers Filmkit's MCP server, and its skill where a tool loads Agent Skills, in each agent tool on the machine
// (Design §8). The tools are rows in tools.js; this applies one to a config file or a tool's own CLI. It is
// idempotent, edits only Filmkit's entry, keeps comments in JSONC files and backs up every file before it writes.
import { spawnSync } from "node:child_process";
import { constants, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, sep } from "node:path";
import { applyEdits, findNodeAtLocation, getNodeValue, modify, parseTree } from "jsonc-parser";
import { isDeepStrictEqual } from "node:util";
import { PACKAGE } from "../studio.js";
import { TOOLS } from "./tools.js";

/**
 * @typedef {{ home: string, platform: NodeJS.Platform, vars: NodeJS.ProcessEnv }} Host  the machine: tests pass a
 *   fixture HOME and another OS's layout
 * @typedef {{ command: string, args: string[] }} McpCommand
 * @typedef {{ id: string, name: string, status: "configured" | "removed" | "skipped" | "failed", changes: string[],
 *   backups: string[], detail?: string }} ToolResult  `changes` is empty when the tool was already set up
 * @typedef {{ remove?: boolean, dryRun?: boolean, only?: string[], command?: McpCommand, host?: Host,
 *   stamp?: string }} Options
 */

/** @returns {Host} */
export const thisHost = () => ({ home: homedir(), platform: process.platform, vars: process.env });

/**
 * How the server runs, from how filmkit itself was run: a checkout runs its own CLI with node; anything npx fetched
 * runs as `npx -y filmkit mcp`, even when it came from GitHub, so the entry starts from npm's cache.
 * @param {string} [packageDir]
 * @returns {McpCommand}
 */
export function mcpCommand(packageDir = PACKAGE) {
  if (!packageDir.includes(`${sep}node_modules${sep}`)) return { command: "node", args: [join(packageDir, "src", "cli", "index.js"), "mcp"] };
  return { command: "npx", args: ["-y", "filmkit", "mcp"] };
}

/**
 * `--mcp-command "npx -y filmkit mcp"` as a command and its arguments; quotes keep a path with spaces together.
 * @param {string} line @returns {McpCommand}
 */
export function parseCommand(line) {
  const [command, ...args] = [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  return { command, args };
}

/**
 * Registers (or with `remove`, unregisters) Filmkit in each tool that's installed.
 * @param {Options} [options]
 * @returns {ToolResult[]}
 */
export function registerAgents({ remove = false, dryRun = false, only, command = mcpCommand(), host = thisHost(), stamp = timestamp() } = {}) {
  const run = { remove, dryRun, stamp, host, command: windowsShell(command, host.platform), skillDirs: new Set() };
  // A skills folder several tools share stays while a tool left out of a partial --remove still has Filmkit.
  if (remove && only) {
    for (const t of TOOLS) if (!only.includes(t.id) && installed(t, host) && registered(t, host)) run.skillDirs.add(t.skills?.(host));
  }
  return TOOLS.filter((t) => !only || only.includes(t.id)).map((tool) => {
    const base = { id: tool.id, name: tool.name, changes: [], backups: [] };
    if (!installed(tool, host)) return { ...base, status: "skipped", detail: "not installed" };
    try {
      return { ...base, ...applyTool(tool, run) };
    } catch (e) {
      return { ...base, status: "failed", detail: /** @type {Error} */ (e).message };
    }
  });
}

/**
 * Windows starts npx through cmd: npx is a .cmd script, which tools spawning without a shell can't run.
 * @param {McpCommand} command @param {NodeJS.Platform} platform
 */
function windowsShell(command, platform) {
  return platform === "win32" && command.command === "npx" ? { command: "cmd", args: ["/c", "npx", ...command.args] } : command;
}

/** @param {import("./tools.js").Tool} tool @param {Host} host */
function installed(tool, host) {
  return (tool.bin && onPath(tool.bin, host)) || (tool.dirs?.(host) ?? []).some((d) => existsSync(d));
}

/**
 * Whether the tool's config has Filmkit's entry; when that can't be told (a CLI tool, an unreadable file), yes.
 * @param {import("./tools.js").Tool} tool @param {Host} host
 */
function registered(tool, host) {
  if (!tool.config) return true;
  const file = tool.config.path(host);
  if (!existsSync(file)) return false;
  try {
    return (tool.config.toml ? tomlEdit : jsonEdit)(file, tool.config.key, undefined)(readFileSync(file, "utf8")) !== undefined;
  } catch {
    return true;
  }
}

/** @param {string} bin @param {Host} host */
function onPath(bin, host) {
  const win = host.platform === "win32";
  const exts = win ? ["", ...(host.vars.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")] : [""];
  return (host.vars.PATH ?? host.vars.Path ?? "").split(win ? ";" : ":").some((d) => d && exts.some((e) => existsSync(join(d, bin + e))));
}

/**
 * @typedef {{ remove: boolean, dryRun: boolean, stamp: string, host: Host, command: McpCommand,
 *   skillDirs: Set<string | undefined> }} Run  `skillDirs`: skills folders already handled, or to leave alone
 * @param {import("./tools.js").Tool} tool
 * @param {Run} run
 * @returns {Pick<ToolResult, "status" | "changes" | "backups" | "detail">}
 */
function applyTool(tool, run) {
  /** @type {string[]} */
  const changes = [];
  /** @type {string[]} */
  const backups = [];
  if (tool.cli) changes.push(...cliTool(/** @type {string} */ (tool.bin), tool.cli, run));
  if (tool.config) {
    const file = tool.config.path(run.host);
    const value = run.remove ? undefined : tool.config.entry(run.command);
    const backup = editFile(file, (tool.config.toml ? tomlEdit : jsonEdit)(file, tool.config.key, value), run);
    if (backup !== undefined) changes.push(`${file} ${tool.config.key.join(".")}`);
    if (backup) backups.push(backup);
  }
  const skills = tool.skills?.(run.host);
  if (skills && !run.skillDirs.has(skills)) {
    run.skillDirs.add(skills);
    if (skill(join(skills, "filmkit"), run)) changes.push(join(skills, "filmkit"));
  }
  if (run.remove && changes.length === 0) return { status: "skipped", changes, backups, detail: "Filmkit wasn't registered" };
  return { status: run.remove ? "removed" : "configured", changes, backups };
}

/**
 * A tool with its own CLI for MCP servers: when its entry isn't already this command, remove it, then add it.
 * @param {string} bin
 * @param {NonNullable<import("./tools.js").Tool["cli"]>} cli
 * @param {Run} run
 * @returns {string[]} the commands run
 */
function cliTool(bin, { add, remove: removeArgs, get, ours, current }, run) {
  const addArgs = add(run.command);
  const show = (/** @type {string[]} */ args) => [bin, ...args].join(" ");
  const found = exec(bin, get, run.host);
  if (run.remove) {
    if (found.status !== 0 || !ours(found.stdout)) return [];
    const removed = run.dryRun || exec(bin, removeArgs, run.host);
    if (removed !== true && removed.status !== 0) throw new Error(`${show(removeArgs)} failed: ${(removed.stderr || removed.stdout).trim()}`);
    return [show(removeArgs)];
  }
  if (found.status === 0 && ours(found.stdout) && current(found.stdout, run.command)) return [];
  if (run.dryRun) return [show(addArgs)];
  exec(bin, removeArgs, run.host);
  const added = exec(bin, addArgs, run.host);
  if (added.status !== 0) throw new Error(`${show(addArgs)} failed: ${(added.stderr || added.stdout).trim()}`);
  return [show(addArgs)];
}

/**
 * On Windows the tool's CLI is often a .cmd script, which only a shell runs, so arguments are quoted for cmd.
 * @param {string} bin @param {string[]} args @param {Host} host
 */
function exec(bin, args, host) {
  const shell = host.platform === "win32";
  const quoted = shell ? args.map((a) => (/[\s"&|<>^]/.test(a) ? `"${a.replaceAll('"', '""')}"` : a)) : args;
  return spawnSync(bin, quoted, { encoding: "utf8", env: host.vars, shell });
}

/**
 * Writes `edit(text)` to the file when it changes anything, after a backup.
 * @param {string} file
 * @param {(text: string) => string | undefined} edit  undefined when there's nothing to do
 * @param {Run} run
 * @returns {string | undefined} undefined: unchanged; "": changed, nothing to back up; else the backup's path
 */
function editFile(file, edit, run) {
  const exists = existsSync(file);
  if (!exists && run.remove) return undefined;
  const text = exists ? readFileSync(file, "utf8") : "";
  const next = edit(text);
  if (next === undefined || next === text) return undefined;
  if (run.dryRun) return "";
  const backup = exists ? backUp(file, run.stamp) : "";
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, next);
  return backup;
}

/**
 * Copies the file beside itself, never over an earlier backup (two runs in one second): `-2`, `-3`, … then.
 * @param {string} file @param {string} stamp @returns {string} the backup's path
 */
function backUp(file, stamp) {
  for (let n = 1; ; n++) {
    const backup = `${file}.filmkit-backup-${stamp}${n > 1 ? `-${n}` : ""}`;
    try {
      copyFileSync(file, backup, constants.COPYFILE_EXCL);
      return backup;
    } catch (e) {
      if (/** @type {NodeJS.ErrnoException} */ (e).code !== "EEXIST") throw e;
    }
  }
}

/**
 * Sets (or with no value, deletes) the entry at `key`, leaving the rest of the file as it was, comments included.
 * @param {string} file @param {string[]} key @param {unknown} value
 */
function jsonEdit(file, key, value) {
  return (/** @type {string} */ text) => {
    /** @type {import("jsonc-parser").ParseError[]} */
    const errors = [];
    const tree = text.trim() ? parseTree(text, errors, { allowTrailingComma: true }) : undefined;
    if (errors.length) throw new Error(`${file} isn't valid JSON (at character ${errors[0].offset}): fix it, then run this again`);
    const node = tree && findNodeAtLocation(tree, key);
    if (node ? isDeepStrictEqual(getNodeValue(node), value) : value === undefined) return undefined;
    if (node?.parent && value === undefined) return removeMember(text, node.parent);
    // First in its object: the formatter tidies the lines it inserts into, and the line after `{` has nothing else.
    return applyEdits(text, modify(text, key, value, { formattingOptions: indentOf(text), getInsertionIndex: () => 0 }));
  };
}

/**
 * Deletes an object member and its comma, and its lines when it has them to itself. jsonc-parser's own removal would
 * take a neighbour's trailing comment with it, or join two lines.
 * @param {string} text @param {import("jsonc-parser").Node} member
 */
function removeMember(text, member) {
  let start = member.offset;
  let end = member.offset + member.length;
  const comma = text.slice(end).match(/^[ \t]*,/);
  let previousComma = -1;
  if (comma) end += comma[0].length;
  else {
    const siblings = member.parent?.children ?? [];
    const previous = siblings[siblings.indexOf(member) - 1];
    if (previous) previousComma = text.indexOf(",", previous.offset + previous.length);
  }
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.slice(end).match(/^[ \t]*\r?\n/);
  if (lineEnd && /^[ \t]*$/.test(text.slice(lineStart, start))) [start, end] = [lineStart, end + lineEnd[0].length];
  const kept = previousComma >= 0 ? text.slice(0, previousComma) + text.slice(previousComma + 1, start) : text.slice(0, start);
  return kept + text.slice(end);
}

/** @param {string} text @returns {import("jsonc-parser").FormattingOptions} */
function indentOf(text) {
  const indent = text.match(/\n([ \t]+)\S/)?.[1] ?? "  ";
  return { insertSpaces: indent[0] !== "\t", tabSize: indent[0] === "\t" ? 1 : indent.length, eol: text.includes("\r\n") ? "\r\n" : "\n" };
}

/**
 * Codex's TOML: Filmkit's table (and its subtables, such as `.env`) is replaced where it stands, or appended. An
 * entry written another way (`filmkit = { … }` under `[mcp_servers]`, or dotted keys) fails the tool rather than
 * become a second definition, which would make the file invalid.
 * @param {string} file @param {string[]} key @param {Record<string, unknown> | undefined} value
 */
function tomlEdit(file, key, value) {
  const block = value ? [`[${key.join(".")}]`, ...Object.entries(value).map(([k, v]) => `${k} = ${toml(v)}`)].join("\n") : "";
  const ours = new RegExp(`^\\s*\\[\\s*${key.map((k) => `(?:${k}|"${k}")`).join("\\s*\\.\\s*")}\\s*(?:\\.[^\\]]*)?\\]`);
  return (/** @type {string} */ text) => {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    if (otherForm(lines, key)) throw new Error(`${file} defines ${key.join(".")} other than as a [${key.join(".")}] table: delete it, then run this again`);
    const start = lines.findIndex((l) => ours.test(l));
    if (start < 0) return block ? `${text.trimEnd()}${text.trim() ? eol + eol : ""}${block.replaceAll("\n", eol)}${eol}` : undefined;
    let end = lines.findIndex((l, i) => i > start && /^\s*\[/.test(l) && !ours.test(l));
    if (end < 0) end = lines.length;
    while (end > start + 1 && /^\s*(#.*)?$/.test(lines[end - 1])) end--;
    if (lines.slice(start, end).join("\n") === block) return undefined;
    const before = block ? lines.slice(0, start) : lines.slice(0, start).join("\n").trimEnd().split("\n");
    return [...before, ...(block ? block.split("\n") : []), ...lines.slice(end)].join(eol);
  };
}

/** Whether `key` is set by an inline table or dotted keys, at the root or in its parent's table. @param {string[]} lines @param {string[]} key */
function otherForm(lines, key) {
  const name = (/** @type {string} */ k) => `(?:${k}|"${k}")`;
  const dotted = (/** @type {string[]} */ ks) => new RegExp(`^\\s*${ks.map(name).join("\\s*\\.\\s*")}\\s*[.=]`);
  const parent = new RegExp(`^\\s*\\[\\s*${key.slice(0, -1).map(name).join("\\s*\\.\\s*")}\\s*\\]`);
  let table = "root";
  return lines.some((l) => {
    if (/^\s*\[/.test(l)) table = parent.test(l) ? "parent" : "other";
    return (table === "root" && dotted(key).test(l)) || (table === "parent" && dotted(key.slice(-1)).test(l));
  });
}

/** A TOML value: strings, numbers and arrays of them are all an MCP entry has. @param {unknown} value @returns {string} */
const toml = (value) => (Array.isArray(value) ? `[${value.map(toml).join(", ")}]` : JSON.stringify(value));

/**
 * Copies the package's skill into a tool's skills folder, replacing an older copy; with `remove`, deletes it.
 * @param {string} dest @param {Run} run
 * @returns {boolean} whether anything changes
 */
function skill(dest, run) {
  const source = join(PACKAGE, "skills", "filmkit");
  const ours = existsSync(join(dest, "SKILL.md")) && /^name:\s*filmkit\s*$/m.test(readFileSync(join(dest, "SKILL.md"), "utf8"));
  if (existsSync(dest) && !ours) throw new Error(`${dest} isn't Filmkit's skill: move it, then run this again`);
  if (run.remove ? !ours : ours && sameFiles(source, dest)) return false;
  if (run.dryRun) return true;
  rmSync(dest, { recursive: true, force: true });
  if (!run.remove) cpSync(source, dest, { recursive: true });
  return true;
}

/** Whether two folders hold the same files with the same contents. @param {string} a @param {string} b */
function sameFiles(a, b) {
  const list = (/** @type {string} */ dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
    // Dirent.parentPath is Node 20.12+; `path` is its older name.
    .map((e) => join(e.parentPath ?? e.path, e.name).slice(dir.length)).sort();
  const files = list(a);
  return isDeepStrictEqual(files, list(b)) && files.every((f) => readFileSync(join(a, f)).equals(readFileSync(join(b, f))));
}

/** 20261112-153600, for backup names. */
function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/-|:/g, "").replace("T", "-");
}
