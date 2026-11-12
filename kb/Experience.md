---
type: design
status: active
tags: [filmkit, ux, cli, experience]
updated: 2026-11-12
issues: [AngleOS/filmkit#2]
---
# Experience: what makes Filmkit a joy to use

Every command, scene and doc is held to this. People use Filmkit two ways: a person in a terminal, and an agent
through MCP or `--json`. Both should feel looked after.

## The first ten minutes
- **One line to a first film.** Install, setup, a first film in their brand and a contact sheet open in the browser,
  in under 10 minutes on a normal laptop. Most of that is the one-time Chrome fetch, and setup says so up front
  ("about 2 minutes, once").
- **No blank page.**
  - `init` creates a studio that already checks and renders.
  - Every template passes `check` as generated.
  - `filmkit new` without `--template` asks which one, or picks `statement` with `--yes`.
- **Show, don't describe.**
  - Setup ends by opening a contact sheet of the first film.
  - `brand` ends by showing a still in the new theme.
  - `render` ends by printing clickable paths (OSC 8 hyperlinks where the terminal supports them), and `--open` opens
    the folder.

## Copy and tone (CLI output, errors, docs)
- **Angle's voice:** short, plain, specific. No exclamation marks, emoji, "Oops!" or "Successfully".
- **Every error says what to do next.** An error names the thing, says what's wrong, and gives the fix, as a command
  where there is one:
  - Not: `Error: ENOENT films/launch/index.html`
  - But: `No film called "launch" in this studio. Films: hello, smoke. Make it with: filmkit new launch`
- **Layout errors point at the frame.** A failed `check` names the format, the time and the element, says what
  collided with what, and gives the snapshot command to see it: `filmkit snapshot launch 9x16 --at 12.4`.
- **Success ends with the next step.** For example: `check passed in 4 formats. Next: filmkit contact launch (review) or
  filmkit render launch`.
- **The banner** (ANGLE FILMKIT in Pear) appears only on `--help`, `setup` and `doctor`, never on every command, and
  never with `--json`, `NO_COLOR` or a non-TTY stdout.

## Progress and speed
- **Nothing silent for more than 2 s.** Long steps show a single updating line: format, step, elapsed time, and an
  estimate once known. For example: `render 9x16  ▓▓▓▓▓░░░  frame 612/1440  0:41 left`. In a non-TTY, print one line
  per step.
- **Fast feedback first.**
  - `check` runs the formats in parallel (bounded by cores and memory).
  - It skips formats whose inputs haven't changed: it hashes the film, the kit, the theme and the sound.
  - It prints each format's result as soon as that format finishes.
- **Preview is live.** `filmkit preview` reloads on save of `films/`, the theme or the kit, and tells you which format
  it's showing and how to switch.
- **Renders are resumable.** A failed or interrupted `render` keeps finished formats, and re-running renders only what's
  missing (`--force` redoes all).

## For agents
- **Stable `--json` and exit codes** ([[projects/filmkit/Interfaces]]). A failed check is data, not a crash.
- **Images they can read.** `snapshot_film` and `contact_sheet` return PNGs no larger than 1568 px, labelled with
  format and time.
- **Self-describing.**
  - `filmkit scenes` and the MCP `list_scenes` list every variable with its default and an example.
  - `filmkit explain <code>` prints why a check rule exists and how to fix it, from the HyperFrames skill references
    and Filmkit's own notes.
- **Safe by default.** Tools write only inside the studio. `setup` keeps a backup of every config it touches, and
  `--remove` undoes it.

## Accessibility and inclusion
- **Colour is never the only signal:** pass and fail carry a word or a symbol too. `NO_COLOR` is honoured
  everywhere.
- **Films:**
  - type is never under 28 px;
  - `check` enforces contrast of text against its ground (WCAG AA for reading text);
  - captions always ship as SRT/VTT.
- **Windows is first-class:** `install.ps1`, paths that work in PowerShell, and no POSIX-only shell in the CLI.

## How we know
- Before each release, a fresh-machine run (a clean VM user, or `HOME=$(mktemp -d)`) from the one-line install to a
  first render, timed and recorded in the release notes.
- Every error message has a test that asserts its next-step command.

## Related
- [[projects/filmkit/Design]] · [[projects/filmkit/Interfaces]] · [[projects/filmkit/02 - Decisions]]
