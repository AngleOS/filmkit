# Filmkit in GitHub Copilot (CLI and VS Code's Copilot agent)

`filmkit agents` finds it by `copilot` on the PATH or a `~/.copilot` folder (`$COPILOT_HOME`).

## What it writes
`~/.copilot/mcp-config.json` (`$COPILOT_HOME/mcp-config.json`), shared by Copilot CLI and VS Code's Copilot agent:
```json
{
  "mcpServers": {
    "filmkit": { "type": "stdio", "command": "npx", "args": ["-y", "filmkit", "mcp"], "tools": ["*"] }
  }
}
```

**Skill:** `~/.agents/skills/filmkit`.

## By hand
Run `copilot mcp add filmkit -- npx -y filmkit mcp`, or in VS Code **MCP: Add Server** › Copilot Global.

## Removing it
`filmkit agents --remove copilot` (or `filmkit agents --remove` for every tool), or by hand: `copilot mcp remove filmkit`, or delete the entry.

Checked against https://code.visualstudio.com/docs/agents/run/manage-mcp-servers · https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers (2026-11-12).
