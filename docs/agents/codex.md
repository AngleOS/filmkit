# Filmkit in Codex

`filmkit agents` finds it by `codex` on the PATH or a `~/.codex` folder (`$CODEX_HOME`).

## What it writes
`~/.codex/config.toml` (`$CODEX_HOME/config.toml`), which the Codex CLI, IDE extension and app share:
```toml
[mcp_servers.filmkit]
command = "npx"
args = ["-y", "filmkit", "mcp"]
startup_timeout_sec = 60
```
The start-up timeout is raised from Codex's 10 seconds because npx downloads Filmkit the first time. Filmkit replaces
the `[mcp_servers.filmkit]` table (and any `[mcp_servers.filmkit.*]` subtable) where it stands, and leaves every other
line alone.

**Skill:** `~/.agents/skills/filmkit`, the folder Codex reads personal skills from.

## By hand
Add the table above (or run `codex mcp add filmkit -- npx -y filmkit mcp`), and copy `skills/filmkit` to `~/.agents/skills/filmkit`.

## Removing it
`filmkit agents --remove codex` (or `filmkit agents --remove` for every tool), or by hand: delete the table (or `codex mcp remove filmkit`) and `~/.agents/skills/filmkit`.

Checked against https://developers.openai.com/codex/mcp · https://developers.openai.com/codex/config-advanced · https://developers.openai.com/codex/skills (2026-11-12).
