# {{name}} films

This repo is an Angle Filmkit studio: {{name}}'s films, written in HTML and rendered to 16:9, 1:1, 4:5 and 9:16
videos with `npx filmkit`.

**Before you make or change a film, read the filmkit skill:** `.claude/skills/filmkit/SKILL.md`. It is the workflow:
brief, research, claims, build, check, look, render, post. Before you write a film's HTML, read the HyperFrames skill
too, `.claude/skills/hyperframes/SKILL.md`: `npx filmkit skills` installs it, matched to the HyperFrames that renders.

- `filmkit.json`: the brand's name, its theme and the default formats.
- `films/<film>/`: `brief.md` and `index.html`, the master every format is laid out from. `films/smoke` mounts every
  kit scene; it checks the theme and isn't for posting.
- `CLAIMS.md`: every word on screen, with its source. A ⚑ row holds back posting.
- `POSTING.md`: where each render goes, with its copy per platform.
- `build/` and `renders/` are made by the CLI and stay out of git.

Start a film with `npx filmkit new <film> --template statement`, and check it with `npx filmkit check <film>`.
