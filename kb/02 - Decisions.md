---
type: project
status: active
tags: [filmkit]
updated: 2026-11-12
---
# Decisions

## D-001 · 2026-11-12 · filmkit: agents make brand films in HTML, from one master into four formats
**Decision.** filmkit is an open-source kit plus tooling: a studio layout, a CLI, an MCP server and an agent skill.
With it, an AI agent turns a brief into a finished short film: 16:9, 1:1, 4:5 and 9:16, with generated sound and
sidecar captions. It is extracted from the kit that made Angle's beta films ([[projects/filmkit/Origins]]). The owner
asked for it on 2026-11-12, "so my friend can make the same videos with ai agents".

**Why:**
- The Angle films showed that agents can make good films when three things hold:
  - the film is code;
  - the kit fixes the look and motion;
  - there is a hard "done" check: it passes in every format, and the agent has looked at its frames.
- None of that is specific to Angle except the brand.

**Alternatives:**
- Keep it inside angle-ai: nobody else can use it.
- Wrap a hosted video API: the cost, the lock-in, and agents can't diff or review a film.

## D-002 · 2026-11-12 · HyperFrames renders, pinned; Node ≥ 20 and ffmpeg are the only requirements
**Decision.** Films render through HyperFrames (HeyGen, Apache-2.0), pinned to one version by the CLI (0.8.186 at
extraction) and run through `npx`. GSAP comes from npm (`gsap`), not a vendored copy. The kit's Python helpers (sound
cue resolution, the loop seam gate, subtitles) are ported to Node, so installing filmkit means Node and ffmpeg.

**Why.**
- The pin is what makes a re-render identical.
- Fewer runtimes means fewer ways for a friend's machine to fail.

**Alternatives:**
- Remotion: React-first, with a licence that charges companies.
- A custom Puppeteer renderer: we'd own frame timing and audio muxing.

## D-003 · 2026-11-12 · The brand is a theme; the studio holds content; the tool is a dependency
**Decision.** Everything brand-specific is a **theme** declared in `filmkit.json`: grounds, accent, text colours,
fonts, logo SVGs, motif. A user's films live in their own **studio** repo (`filmkit init`). filmkit ships the kit and
copies it into each build.

**Why:**
- Angle's kit hard-coded Night and Pear, the brand lines and the ANGLE lockup.
- A friend needs their own brand in minutes, without forking the tool.
- Updates never touch their films.

## D-004 · 2026-11-12 · Agents are first-class users: an MCP server and a skill, and frames they can see
**Decision.** Everything the CLI does is also an MCP tool. `snapshot_film` and `contact_sheet` return images, so the
model reviews its own frames. A skill (`skills/filmkit/`) teaches the workflow: brief, research, claims, build, check,
look, render. The CLI's `--json` output and exit codes are stable.

**Why.** Looking at the frames is what caught the 9:16 overlaps in every Angle film. An agent that can't see its
output ships broken layouts.

## D-005 · 2026-11-12 · MIT licence; third-party code keeps its own
**Decision.** filmkit is MIT. The rest keep their own licences, listed in `THIRD_PARTY.md`:
- the vendored `sound-sheet.mjs` and the launch-video research notes (MIT, AgentsORG/design-engineering);
- the default theme's Geist fonts (OFL);
- lucide icons (ISC);
- GSAP (its standard no-charge licence, through npm);
- HyperFrames (Apache-2.0, through npx).

**Why.** It's the most permissive choice that stays compatible with everything we bundle.

## D-006 · 2026-11-12 · Built by the agent fleet, issue by issue
**Decision.** filmkit is built like every AngleOS project:
- the epic and its issues are on the Angle board;
- agents work them (`agent:mac` for anything that renders, because the MacBook has the proven toolchain);
- agentd reviews and lands the PRs.

The foundation (kb, AGENTS.md, README, LICENSE) was written by the orchestrating session.

## D-007 · 2026-11-12 · Angle Filmkit: an Angle-branded product, with Angle's look as the default
**Decision (owner, 2026-11-12):** "make this an angle branded product though. use our logo branding etc wherever
appropriate and cool." The repo stays private for now; the owner adds collaborators.

- **Name.** The product is **Angle Filmkit**. The package and CLI stay `filmkit`, and the MCP server is
  `filmkit` ("Angle Filmkit").
- **The tool's own surfaces carry the full Angle brand:** the README hero (`docs/assets/hero.png`, rendered with the
  kit), the docs, the CLI's banner and `doctor`, the MCP server's name and description, and the example studio.
- **Built-in themes:**
  - **`angle`**: the complete brand (Night, Castleton, Jet and Paper grounds; the Pear accent; Geist; the brand lines;
    the ANGLE lockup). It's used for Angle's and Filmkit's own films and the example studio.
  - **`default`**: Angle's *look* (the same palette, type and lines motif) with the **studio's own logo**, so
    everything made with Filmkit looks like Angle until someone rethemes it.
  - **`paper`**: the light variant.
- **The theme contract.** A theme is a folder:
  - `theme.json`: grounds, `ground`, accent, `accentOn`, text, fonts and faces, tokens, logo files, motif, credit;
  - `tokens.css`: CSS custom properties;
  - `fonts/`;
  - `logo/`;
  - optionally `brand.js`, which sets `window.KB = { motif(svg), lockup(svg), lockupBox(w, cy) }`.

  The kit's `motif`, `mark` and `endcard` scenes call `KB`, and a theme with no `brand.js` gets the kit's generic
  logo reveal. `themes/angle/` is the reference implementation.
- **The credit.** End cards show a small "Made with Angle Filmkit" line by default (`theme.credit`). A studio turns it
  off with `"credit": false`.
- **The example studio is Angle's own:** films that introduce Angle Filmkit, in the `angle` theme. Filmkit makes its
  own launch film, and that is the visual regression set.
- **Brand assets aren't MIT.** The Angle name, logo, mark, wordmark and lines are trademarks (`TRADEMARKS.md`). The
  code stays MIT.

This revises D-003 and the "No Angle content" constraint. Angle's *product* films, their claims and the rebuilt Angle
app UI (`picker`, the Angle composer) still stay in `angle-ai`.

## D-008 · 2026-11-12 · One command (or one prompt) from nothing to a first film in your brand
**Decision (owner, 2026-11-12):** "should be a one line command install with walkthroughs and automatic setup with
mcp with popular tools the user may want to use with it. or also a prompt to give your agent to install and
configure it with the brand and stuff."

How it works:
- `install.sh` and `install.ps1`, or `npx filmkit setup`;
- `filmkit setup`: requirements, then MCP registration in every detected agent tool (Claude Code, Claude Desktop, Codex,
  Cursor, VS Code/Copilot, Windsurf, Zed, Gemini CLI, opencode), then studio, then brand onboarding (`filmkit brand`,
  from a URL or questions), then a first film;
- `filmkit prompt` and `docs/install-with-your-agent.md`, so the user's agent does all of it.

Design §8 has the details. `setup`, `brand` and `tour` may prompt in a terminal. They are the exception to "the CLI
never prompts", and every prompt has a flag, so `--yes` runs them unattended.

**Why:** the people this is for (the owner's friend, other founders) have an agent but won't hand-edit four tools'
MCP configs or write a theme file.

## D-009 · 2026-11-12 · The website: an Angle-branded one-pager on GitHub Pages, built like angle-ai's site
**Decision (owner, 2026-11-12):** "make a basic but very well thought out and laid out marketing site one pager with
install directions, examples, etc. angle branded … use github pages … latest and greatest tools … lighthouse
performance checks, a11y."

- **The site:** `site/` (PR #26). It uses angle-ai `apps/site`'s stack: Next.js 16 static export, React 19,
  Tailwind 4, Geist, Biome, TypeScript, and Vitest with axe-core.
- **The quality bar:** Lighthouse CI on mobile, with performance, best practices and SEO at 0.95 or more and
  accessibility at 1.0. The first local run scored 99/100/100/100.
- **Deploy:** GitHub Pages from master (`.github/workflows/site.yml`, self-hosted runners) at
  https://angleos.github.io/filmkit/.
- **Pages is public.** A Pages site is public even though the repo is private (the org has no Enterprise private
  Pages). The site holds only marketing copy and example films. Its install commands work only for people with repo
  access until the repo goes public (#15).
- **Design:**
  - The page reads as a storyboard: numbered beats, timecodes, viewfinder marks.
  - The hero is a live format switcher that re-lays a sample customer film (Lumen, default theme).
  - The brand lines appear only inside that frame (owner: "ease up on the lines").
  - No "early access" wording (owner).
  - Mobile first, checked at 360, 390, 768 and 1440 px under real device emulation.

## D-009 · 2026-11-12 · The site lives at filmkit.anglehq.net, on GitHub Pages

**Decision:** the marketing one-pager (`site/`, Next.js static export) deploys from `.github/workflows/site.yml` to GitHub
Pages and is served at the root of `https://filmkit.anglehq.net/`. `site/public/CNAME` carries the domain, and the
repo's Pages settings set it too, with HTTPS enforced. DNS is a `filmkit` CNAME → `angleos.github.io` in the
`anglehq.net` Cloudflare zone, **DNS only (grey cloud)**, so GitHub can issue the certificate. The specific record
overrides the proxied `*.anglehq.net` wildcard that sends everything else to the cloudflared tunnel.
**Why:** a domain under the Angle brand, with no server of ours in the path (Pages is free, global and survives
ca-server reboots), and GitHub-only deploys. Pages serves the site publicly while the repo stays private.
**Consequences:** the build needs no base path (`SITE_BASE_PATH` stays for a build served under a path). Canonical,
OG and sitemap URLs come from `SITE_URL` in `site/src/lib/content.ts`.

- **D-20261112-13-delegated** (AngleOS/filmkit#13, 2026-11-12 20:11 UTC): filmkit's npm release job (only on v* tags) runs on a GitHub-hosted ubuntu-latest runner so the package is published with npm provenance; all CI stays on the self-hosted runners and hosted use stays within the included minutes ($0 spending limit). *Why:* A — put only the release job on `ubuntu-latest` and publish with `npm publish --provenance`. `ci.yml` stays on `[self-hosted, ci, Linux]`. Why: - **Cost.** The release job runs about 2 minutes per `v*` tag. That fits in the plan's included Actions minutes, and the org's spending limit stays at $0, so it can never cost money. The rule is "included quota only, never overage", not "never hosted". Once the repo is public, the minutes are free. - **Provenance is worth it.** Provenance is the supply-chain proof users get for a CLI they run through `npx`. We would lose it on self-hosted runners and c *Reverse:* In .github/workflows/release.yml set runs-on back to [self-hosted, ci, Linux] and drop --provenance (and the id-token permission). (decided by the Expert)

- **D-20261112-26-delegated** (AngleOS/filmkit#26, 2026-11-12 20:57 UTC): The Filmkit site launches with WebP posters in place of its five example videos. The MP4s follow in a separate slice, committed under a narrow site/public/media/*.mp4 gitignore exception. *Why:* B — Ship the posters only for now. Land #26 without video, and track the MP4s as a follow-up slice. What to do in this PR: - In `site/src/app/page.tsx` (lines ~112 and ~339), render the teaser and the four example slots as their `.webp` posters in a plain `<img>`, with the same label/alt and the same aspect box. Drop the `LoopVideo` use for now. Keep `loop-video.tsx` if the follow-up will reuse it as-is; otherwise remove it, because we don't keep dead code. - Change the tests so every example has a poster image with alt text. Drop the video assertions (preload/pause) for now, and keep axe and  *Reverse:* Merge the follow-up issue that adds the MP4s and restores LoopVideo in site/src/app/page.tsx. (decided by the Expert)

- **D-20261112-4-delegated** (AngleOS/filmkit#4, 2026-11-12 21:45 UTC): filmkit's sound is dry foley over the tonal pad only: the sound.json "bed" value is the pad's gain in dB and is stripped before the vendored sound-sheet, so films no longer get sound-sheet's accidental default 43 Hz sub drone that angle-ai's films carried. *Why:* B — Dry foley. Before handing the score to the vendored sound-sheet, remove `bed` from it. In filmkit, `bed` means one thing only: the pad's gain in dB for the mix, default −12. Why: - I checked the source. `video.sh:76` reads `score.bed` as the pad gain. sound-sheet's `renderBed(sheet.bed)` (vendor line ~510) sees a truthy `-12` and renders its default drone: a 43.1 Hz sub at −18 plus its own −27 pad. The angle-ai README (§ Sound) and the `mix.sh` header both describe dry foley over the tonal pad, so the drone was an accident, not a choice. - Angle's product films stay in angle-ai (D-007), so *Reverse:* Stop stripping "bed" from the score passed to kit/sound/vendor/sound-sheet.mjs, so the default drone (43.1 Hz, −18) comes back under the pad. (decided by the Expert)

## Related
- [[projects/filmkit/00 - Home]] · [[projects/filmkit/Design]] · [[projects/filmkit/Origins]]
