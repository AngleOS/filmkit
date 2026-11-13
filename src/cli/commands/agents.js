import { homedir } from "node:os";
import { mcpCommand, parseCommand, registerAgents } from "../../agents/register.js";
import { TOOLS } from "../../agents/tools.js";
import { fail } from "../../errors.js";

export const usage = "agents [tools…]";
export const summary = "registers filmkit's MCP server and skill in each agent tool installed (--remove, --dry-run, --mcp-command)";
export const options = {
  remove: { type: /** @type {const} */ ("boolean") },
  "dry-run": { type: /** @type {const} */ ("boolean") },
  "mcp-command": { type: /** @type {const} */ ("string") },
};

const MARK = { configured: "✓", removed: "✓", skipped: "·", failed: "✗" };

/** @param {import("../index.js").Context} ctx */
export async function run({ args, options, log }) {
  const ids = TOOLS.map((t) => t.id);
  const unknown = args.filter((a) => !ids.includes(a));
  if (unknown.length) throw fail("unknown_tool", { unknown, tools: ids });
  const line = /** @type {string | undefined} */ (options["mcp-command"]);
  const command = line ? parseCommand(line) : mcpCommand();
  const dryRun = options["dry-run"] === true;
  const remove = options.remove === true;
  const tools = registerAgents({ remove, dryRun, command, only: args.length ? args : undefined });

  const home = homedir();
  const tilde = (/** @type {string} */ s) => s.replaceAll(home, "~");
  const width = Math.max(...tools.map((t) => t.name.length));
  if (!remove) log(`${dryRun ? "Would register" : "MCP server"}: ${[command.command, ...command.args].join(" ")}`);
  for (const t of tools) {
    const what = tilde(t.detail ?? (t.changes.length ? t.changes.join("; ") : "already set up"));
    log(`${MARK[t.status]} ${t.name.padEnd(width)}  ${dryRun && t.status !== "skipped" ? "would change" : t.status}: ${what}`);
  }
  const backups = tools.flatMap((t) => t.backups);
  if (backups.length) log(`Backups: ${backups.map(tilde).join(", ")}`);
  return { ok: tools.every((t) => t.status !== "failed"), dryRun, command, tools };
}
