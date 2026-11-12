---
type: project
status: active
tags: [filmkit]
updated: 2026-11-12
---
# Constraints

- **No Angle content in filmkit.** No Angle brand, rebuilt Angle UI, films or claims. Examples use a fictional
  brand. Angle stays a studio that consumes filmkit ([[projects/filmkit/Design]], "What stays in Angle").
- **Only redistributable assets.** OFL or other open fonts in themes, our own sounds (no licensed music), and icons
  under permissive licences. Anything vendored is listed in `THIRD_PARTY.md`.
- **Deterministic renders.** The renderer is pinned, the sound uses no randomness (seeded per cue), and every font is
  local. A film re-rendered tomorrow is bit-for-bit the same picture.
- **Renders are never committed or uploaded as CI artifacts.** They're large; CI checks films and renders them to a
  temporary directory only.
- **Text is never under 28 px at 1080 width, and every key word stays inside `AL.safe`.**
- **Captions are sidecar files by default.** Burning them in is opt-in (`burn`).
- **Requirements: Node ≥ 20 and ffmpeg.** HyperFrames brings its own Chrome. No Python and no global installs.
