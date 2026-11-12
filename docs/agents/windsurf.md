# Filmkit in Windsurf (and Devin Desktop)

`filmkit agents` finds it by a `~/.codeium/windsurf` folder.

## What it writes
`~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "filmkit": { "command": "npx", "args": ["-y", "filmkit", "mcp"] }
  }
}
```

Windsurf became Devin Desktop in June 2026. Devin keeps its own servers in `~/.config/devin/mcp_config.json`, and
imports Windsurf's file by default (`read_config_from.windsurf`), so this one entry reaches both. Devin also imports
Claude Code's, Cursor's, opencode's and Zed's servers, so it may list Filmkit more than once.

**Skill:** `~/.agents/skills/filmkit`, which Devin reads.

## By hand
Add the entry to the file, or in Devin Desktop to `~/.config/devin/mcp_config.json`.

## Removing it
`filmkit agents --remove windsurf` (or `filmkit agents --remove` for every tool), or by hand: delete the `filmkit` entry.

Checked against https://docs.devin.ai/cli/reference/configuration/read-config-from · https://docs.devin.ai/cli/extensibility/mcp/configuration · https://docs.devin.ai/cli/extensibility/skills/overview (2026-11-12).
