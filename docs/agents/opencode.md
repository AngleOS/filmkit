# Filmkit in opencode

`filmkit agents` finds it by `opencode` on the PATH or its config folder.

## What it writes
`~/.config/opencode/opencode.json`, or `opencode.jsonc` when that's the one you have (`$OPENCODE_CONFIG_DIR`
replaces the folder), on every OS:
```json
{
  "mcp": {
    "filmkit": { "type": "local", "command": ["npx", "-y", "filmkit", "mcp"], "enabled": true }
  }
}
```
This is the V1 shape, which opencode V2 still reads beside its own `mcp.servers`.

**Skill:** `~/.agents/skills/filmkit`. opencode also reads `~/.claude/skills`.

## By hand
Add the entry to the file.

## Removing it
`filmkit agents --remove opencode` (or `filmkit agents --remove` for every tool), or by hand: delete the `filmkit` entry.

Checked against https://opencode.ai/docs/mcp-servers/ · https://opencode.ai/docs/config/ · https://opencode.ai/docs/skills/ (2026-11-12).
