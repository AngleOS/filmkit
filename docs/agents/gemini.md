# Filmkit in Gemini CLI

`filmkit agents` finds it by `gemini` on the PATH (not `~/.gemini`: Antigravity CLI uses that folder too).

## What it writes
`~/.gemini/settings.json` (`$GEMINI_CLI_HOME/.gemini/settings.json`):
```json
{
  "mcpServers": {
    "filmkit": { "command": "npx", "args": ["-y", "filmkit", "mcp"] }
  }
}
```

**Skill:** `~/.agents/skills/filmkit`.

## By hand
Add the entry to the file.

## Removing it
`filmkit agents --remove gemini` (or `filmkit agents --remove` for every tool), or by hand: delete the `filmkit` entry, or `gemini mcp remove filmkit`.

Checked against https://geminicli.com/docs/tools/mcp-server/ · https://geminicli.com/docs/cli/skills/ (2026-11-12).
