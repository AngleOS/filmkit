---
type: project
status: active
tags: [filmkit]
updated: 2026-11-12
---
# Constraints

- **Angle's brand, but not Angle's product films** (D-007). The Angle theme, logo and look belong here, and so do
  films about Angle Filmkit. Angle's product films, their claims and the rebuilt Angle app UI stay in `angle-ai`.
  Brand assets are trademarks, not MIT (`TRADEMARKS.md`).
- **Only redistributable assets.** OFL or other open fonts in themes, our own sounds (no licensed music), and icons
  under permissive licences. Anything vendored is listed in `THIRD_PARTY.md`.
- **Deterministic renders.** The renderer is pinned, the sound uses no randomness (seeded per cue), and every font is
  local. A film re-rendered tomorrow is bit-for-bit the same picture.
- **Renders are never committed or uploaded as CI artifacts.** They're large; CI checks films and renders them to a
  temporary directory only.
- **Text is never under 28 px at 1080 width, and every key word stays inside `AL.safe`.**
- **Captions are sidecar files by default.** Burning them in is opt-in (`burn`).
- **Requirements: Node ≥ 20.12 and ffmpeg.** HyperFrames brings its own Chrome. No Python and no global installs.
