# Filmkit in Claude Code

`filmkit agents` finds it by `claude` on the PATH.

## What it writes
It runs Claude Code's own command, at user scope, so the server is there in every project:
```sh
claude mcp remove -s user filmkit   # only when it's already there, so a re-run replaces it
claude mcp add -s user filmkit -- npx -y filmkit mcp
```
Claude Code keeps it in `~/.claude.json`; Filmkit doesn't edit that file itself.

**Skill:** `~/.claude/skills/filmkit` (`$CLAUDE_CONFIG_DIR/skills/filmkit` when that's set).

## By hand
Run the `claude mcp add` line above, and copy `skills/filmkit` from this repo to `~/.claude/skills/filmkit`. `claude mcp list` should show `filmkit` connected.

## Removing it
`filmkit agents --remove claude-code` (or `filmkit agents --remove` for every tool), or by hand: `claude mcp remove -s user filmkit`, then delete `~/.claude/skills/filmkit`.

Checked against https://code.claude.com/docs/en/mcp · https://code.claude.com/docs/en/skills (2026-11-12).
