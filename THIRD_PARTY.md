# Third-party components

| Component | Where | Licence | Source |
|---|---|---|---|
| HyperFrames | renderer, run through `npx` at a pinned version | Apache-2.0 | https://github.com/heygen-com/hyperframes |
| GSAP | npm dependency `gsap` (3.14.2), copied into each build as `kit/vendor/gsap.min.js` | GSAP Standard "no charge" licence | https://gsap.com/standard-license |
| sound-sheet.mjs | `kit/sound/vendor/` (once ported) | MIT | AgentsORG/design-engineering |
| Launch-video research notes | `skills/filmkit/references/research/` | MIT | AgentsORG/design-engineering |
| Geist, Geist Mono | `themes/angle/fonts/`, `themes/default/fonts/` (each with `OFL.txt`) | SIL OFL 1.1 | https://github.com/vercel/geist-font |
| lucide icons | `kit/icons.js` (once ported) | ISC | https://lucide.dev |

Each vendored file keeps its upstream header. Add a row here when you vendor anything.

The Angle name, logo, mark, wordmark and brand lines (`themes/angle/logo/`, `themes/angle/brand.js`, `brand/`) are Angle's trademarks: see `TRADEMARKS.md`.
