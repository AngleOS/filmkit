# Filmkit in VS Code

`filmkit agents` finds it by its user settings folder.

## What it writes
The profile's `mcp.json`, beside `settings.json`, which VS Code's own agent reads:
- macOS: `~/Library/Application Support/Code/User/mcp.json`
- Windows: `%APPDATA%\Code\User\mcp.json`
- Linux: `~/.config/Code/User/mcp.json`

```json
{
  "servers": {
    "filmkit": { "type": "stdio", "command": "npx", "args": ["-y", "filmkit", "mcp"] }
  }
}
```

The key is `servers`, not `mcpServers`. VS Code's Copilot agent reads the Copilot file instead: see
[GitHub Copilot](copilot.md).

**Skill:** none here: the Copilot row installs it in `~/.agents/skills`, which VS Code's agents read.

## By hand
Run **MCP: Add Server** from the command palette, or:
```sh
code --add-mcp '{"name":"filmkit","type":"stdio","command":"npx","args":["-y","filmkit","mcp"]}'
```

## Removing it
`filmkit agents --remove vscode` (or `filmkit agents --remove` for every tool), or by hand: delete the `filmkit` entry, or run **MCP: List Servers** and remove it.

Checked against https://code.visualstudio.com/docs/copilot/reference/mcp-configuration · https://code.visualstudio.com/docs/copilot/customization/mcp-servers (2026-11-12).
