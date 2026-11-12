# Filmkit in Zed

`filmkit agents` finds it by its config folder.

## What it writes
`settings.json`, under `context_servers`:
- macOS: `~/.config/zed/settings.json`
- Linux: `$XDG_CONFIG_HOME/zed/settings.json` (`~/.config/zed`)
- Windows: `%APPDATA%\Zed\settings.json`

```json
{
  "context_servers": {
    "filmkit": { "command": "npx", "args": ["-y", "filmkit", "mcp"] }
  }
}
```

The file is JSON with comments: Filmkit keeps them, and every other setting, as they were.

**Skill:** `~/.agents/skills/filmkit`, the only global folder Zed's agent reads.

## By hand
Add the entry with **zed: open settings**, or **agent: add context server**.

## Removing it
`filmkit agents --remove zed` (or `filmkit agents --remove` for every tool), or by hand: delete the `filmkit` entry.

Checked against https://zed.dev/docs/ai/mcp · https://zed.dev/docs/ai/skills (2026-11-12).
