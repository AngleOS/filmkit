# Filmkit in Claude Desktop

`filmkit agents` finds it by its config folder.

## What it writes
`claude_desktop_config.json`:
- macOS: `~/Library/Application Support/Claude/`
- Windows: `%APPDATA%\Claude\`
- Linux (the Debian and Ubuntu beta): `~/.config/Claude/`

```json
{
  "mcpServers": {
    "filmkit": { "command": "npx", "args": ["-y", "filmkit", "mcp"] }
  }
}
```

**Skill:** none. The chat app uses the skills enabled on your claude.ai account; its Code tab reads Claude Code's `~/.claude/skills`.

## By hand
Settings › Developer › Edit Config opens the file. Add the entry, then quit Claude Desktop fully and start it again.

## Removing it
`filmkit agents --remove claude-desktop` (or `filmkit agents --remove` for every tool), or by hand: delete the `filmkit` entry and restart the app.

Checked against https://modelcontextprotocol.io/docs/develop/connect-local-servers · https://code.claude.com/docs/en/desktop-linux (2026-11-12).
