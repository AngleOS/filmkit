// The agent tools `filmkit agents` (and setup's agent step) registers Filmkit in: one row per tool, so adding a tool is
// one row. Each row cites the docs its paths and format come from (checked 2026-11-12); they change, so check them
// again when you touch a row.
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef {import("./register.js").Host} Host
 * @typedef {import("./register.js").McpCommand} McpCommand
 * @typedef {{ path: (h: Host) => string, key: string[], entry: (c: McpCommand) => Record<string, unknown>,
 *   toml?: boolean }} Config  Filmkit's `entry` at `key` in a JSON file (comments allowed) or a TOML one
 * @typedef {{ id: string, name: string, bin?: string, dirs?: (h: Host) => string[], config?: Config,
 *   cli?: { add: (c: McpCommand) => string[], remove: string[] }, skills?: (h: Host) => string }} Tool
 *   Installed when `bin` is on the PATH or one of `dirs` exists. A tool with its own `cli` for MCP servers is
 *   registered with it (`bin` and the arguments). `skills` is the folder it loads Agent Skills from.
 */

/** @param {Host} h */
const xdgConfig = (h) => h.vars.XDG_CONFIG_HOME ?? join(h.home, ".config");
/** ~/Library/Application Support on macOS, %APPDATA% on Windows, $XDG_CONFIG_HOME on Linux. @param {Host} h */
const appConfig = (h) =>
  h.platform === "darwin" ? join(h.home, "Library", "Application Support")
  : h.platform === "win32" ? h.vars.APPDATA ?? join(h.home, "AppData", "Roaming")
  : xdgConfig(h);
/** The cross-tool skills folder: Codex, Cursor, Copilot, Devin/Windsurf, Zed, Gemini CLI and opencode read it. @param {Host} h */
const agentsSkills = (h) => join(h.home, ".agents", "skills");

/** @param {McpCommand} c */
const stdio = (c) => ({ command: c.command, args: c.args });
const mcpServers = ["mcpServers", "filmkit"];

/** @type {Tool[]} */
export const TOOLS = [
  {
    // https://code.claude.com/docs/en/mcp · https://code.claude.com/docs/en/skills · https://code.claude.com/docs/en/env-vars
    id: "claude-code",
    name: "Claude Code",
    bin: "claude",
    cli: {
      add: (c) => ["mcp", "add", "-s", "user", "filmkit", "--", c.command, ...c.args],
      remove: ["mcp", "remove", "-s", "user", "filmkit"],
    },
    skills: (h) => join(h.vars.CLAUDE_CONFIG_DIR ?? join(h.home, ".claude"), "skills"),
  },
  {
    // https://modelcontextprotocol.io/docs/develop/connect-local-servers · https://code.claude.com/docs/en/desktop-linux
    id: "claude-desktop",
    name: "Claude Desktop",
    dirs: (h) => [join(appConfig(h), "Claude")],
    config: { path: (h) => join(appConfig(h), "Claude", "claude_desktop_config.json"), key: mcpServers, entry: stdio },
  },
  {
    // https://developers.openai.com/codex/mcp · https://developers.openai.com/codex/config-advanced ·
    // https://developers.openai.com/codex/skills. The default 10 s start-up timeout is short for npx's first fetch.
    id: "codex",
    name: "Codex",
    bin: "codex",
    dirs: (h) => [codexHome(h)],
    config: {
      path: (h) => join(codexHome(h), "config.toml"),
      key: ["mcp_servers", "filmkit"],
      entry: (c) => ({ ...stdio(c), startup_timeout_sec: 60 }),
      toml: true,
    },
    skills: agentsSkills,
  },
  {
    // https://cursor.com/docs/context/mcp · https://cursor.com/docs/context/skills
    id: "cursor",
    name: "Cursor",
    dirs: (h) => [join(h.home, ".cursor")],
    config: { path: (h) => join(h.home, ".cursor", "mcp.json"), key: mcpServers, entry: (c) => ({ type: "stdio", ...stdio(c) }) },
    skills: agentsSkills,
  },
  {
    // VS Code's own MCP client, the profile's mcp.json beside settings.json:
    // https://code.visualstudio.com/docs/copilot/reference/mcp-configuration
    id: "vscode",
    name: "VS Code",
    dirs: (h) => [join(appConfig(h), "Code", "User")],
    config: {
      path: (h) => join(appConfig(h), "Code", "User", "mcp.json"),
      key: ["servers", "filmkit"],
      entry: (c) => ({ type: "stdio", ...stdio(c) }),
    },
  },
  {
    // Copilot CLI and VS Code's Copilot agent share it: https://code.visualstudio.com/docs/agents/run/manage-mcp-servers
    // · https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
    id: "copilot",
    name: "GitHub Copilot",
    bin: "copilot",
    dirs: (h) => [copilotHome(h)],
    config: {
      path: (h) => join(copilotHome(h), "mcp-config.json"),
      key: mcpServers,
      entry: (c) => ({ type: "stdio", ...stdio(c), tools: ["*"] }),
    },
    skills: agentsSkills,
  },
  {
    // Windsurf's file, which Devin Desktop (Windsurf's successor) imports by default:
    // https://docs.devin.ai/cli/reference/configuration/read-config-from · https://docs.devin.ai/cli/extensibility/skills/overview
    id: "windsurf",
    name: "Windsurf",
    dirs: (h) => [join(h.home, ".codeium", "windsurf")],
    config: { path: (h) => join(h.home, ".codeium", "windsurf", "mcp_config.json"), key: mcpServers, entry: stdio },
    skills: agentsSkills,
  },
  {
    // https://zed.dev/docs/ai/mcp · https://zed.dev/docs/ai/skills. macOS keeps it in ~/.config/zed, whatever XDG says.
    id: "zed",
    name: "Zed",
    dirs: (h) => [zedConfig(h)],
    config: { path: (h) => join(zedConfig(h), "settings.json"), key: ["context_servers", "filmkit"], entry: stdio },
    skills: agentsSkills,
  },
  {
    // https://geminicli.com/docs/tools/mcp-server/ · https://geminicli.com/docs/cli/skills/. Only the binary: Antigravity
    // CLI uses ~/.gemini too.
    id: "gemini",
    name: "Gemini CLI",
    bin: "gemini",
    config: { path: (h) => join(h.vars.GEMINI_CLI_HOME ?? h.home, ".gemini", "settings.json"), key: mcpServers, entry: stdio },
    skills: agentsSkills,
  },
  {
    // https://opencode.ai/docs/mcp-servers/ · https://opencode.ai/docs/config/ · https://opencode.ai/docs/skills/. The V1
    // shape, which V2 still reads.
    id: "opencode",
    name: "opencode",
    bin: "opencode",
    dirs: (h) => [opencodeConfig(h)],
    config: {
      path: (h) => (existsSync(join(opencodeConfig(h), "opencode.jsonc")) ? join(opencodeConfig(h), "opencode.jsonc") : join(opencodeConfig(h), "opencode.json")),
      key: ["mcp", "filmkit"],
      entry: (c) => ({ type: "local", command: [c.command, ...c.args], enabled: true }),
    },
    skills: agentsSkills,
  },
];

/** @param {Host} h */
const codexHome = (h) => h.vars.CODEX_HOME ?? join(h.home, ".codex");
/** @param {Host} h */
const copilotHome = (h) => h.vars.COPILOT_HOME ?? join(h.home, ".copilot");
/** @param {Host} h */
const zedConfig = (h) => (h.platform === "win32" ? join(appConfig(h), "Zed") : h.platform === "darwin" ? join(h.home, ".config", "zed") : join(xdgConfig(h), "zed"));
/** @param {Host} h */
const opencodeConfig = (h) => h.vars.OPENCODE_CONFIG_DIR ?? join(xdgConfig(h), "opencode");
