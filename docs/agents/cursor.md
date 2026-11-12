# Filmkit in Cursor

`filmkit agents` finds it by a `~/.cursor` folder.

## What it writes
`~/.cursor/mcp.json` (on Windows, `%USERPROFILE%\.cursor\mcp.json`):
```json
{
  "mcpServers": {
    "filmkit": { "type": "stdio", "command": "npx", "args": ["-y", "filmkit", "mcp"] }
  }
}
```

**Skill:** `~/.agents/skills/filmkit`. Cursor also reads `~/.claude/skills`, so with Claude Code installed it finds the same skill twice.

## By hand
Add the entry to `~/.cursor/mcp.json`, or use Cursor Settings › MCP.

## Removing it
`filmkit agents --remove cursor` (or `filmkit agents --remove` for every tool), or by hand: delete the `filmkit` entry.

Checked against https://cursor.com/docs/context/mcp · https://cursor.com/docs/context/skills (2026-11-12).
