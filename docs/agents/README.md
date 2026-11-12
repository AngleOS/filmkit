# Filmkit in your agent tools

`filmkit agents` registers Filmkit's MCP server in every agent tool it finds on your machine, and installs the
Filmkit skill where a tool loads Agent Skills. `filmkit setup` runs it as its agent step.

```sh
filmkit agents                    # every tool it finds
filmkit agents cursor zed         # only these
filmkit agents --dry-run          # say what would change, change nothing
filmkit agents --remove           # take Filmkit out again, leaving the rest of each config alone
filmkit agents --mcp-command "npx -y github:AngleOS/filmkit mcp"
```

- **It edits only Filmkit's entry.** Every other key, server and comment in the file stays as it was. Running it
  again updates the entry; it never adds a second one.
- **It backs up every file before it writes:** `<file>.filmkit-backup-<date>-<time>`, beside the file.
- **The server command** follows how you ran Filmkit: `npx -y github:AngleOS/filmkit mcp` when npx fetched it from
  GitHub (while the repo is private), `npx -y filmkit mcp` from npm, and `node <checkout>/src/cli/index.js mcp` from
  a clone. `--mcp-command` sets it. On Windows, npx is started through `cmd /c`.
- **The skill** is copied to `~/.claude/skills/filmkit` for Claude Code and to `~/.agents/skills/filmkit`, the folder
  Codex, Cursor, Copilot, Devin, Zed, Gemini CLI and opencode read.
- **`--json`** prints `{ ok, dryRun, command, tools: [{ id, name, status, changes, backups, detail? }] }`, where
  `status` is `configured`, `removed`, `skipped` (not installed, or nothing to remove) or `failed` (with `detail`
  saying why). It exits 1 when a tool failed.

| Tool | id | Page |
|---|---|---|
| Claude Code | `claude-code` | [claude-code.md](claude-code.md) |
| Claude Desktop | `claude-desktop` | [claude-desktop.md](claude-desktop.md) |
| Codex | `codex` | [codex.md](codex.md) |
| Cursor | `cursor` | [cursor.md](cursor.md) |
| VS Code | `vscode` | [vscode.md](vscode.md) |
| GitHub Copilot (CLI and VS Code's Copilot agent) | `copilot` | [copilot.md](copilot.md) |
| Windsurf and Devin Desktop | `windsurf` | [windsurf.md](windsurf.md) |
| Zed | `zed` | [zed.md](zed.md) |
| Gemini CLI | `gemini` | [gemini.md](gemini.md) |
| opencode | `opencode` | [opencode.md](opencode.md) |

The pages show the entry with `npx -y filmkit mcp`. While Filmkit isn't on npm, use `github:AngleOS/filmkit` in
place of `filmkit`. Each tool is one row in `src/agents/tools.js`, with links to the docs its paths come from.
