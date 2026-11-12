# The brief

Every film starts from `films/<film>/brief.md`. The brief decides the film; the build only carries it out. Write it
before you touch a scene, and keep it short: one page plus the beats table.

## How to write it
- **Write for one audience.** "Developers" is too broad; "backend developers who already pay for an OpenAI key" is a
  brief.
- **One promise.** The one sentence the viewer should remember. Every beat serves it or goes.
- **Name the eye-rolls.** What this audience has heard too often and stops trusting: superlatives, "revolutionary",
  stock dashboards, a number without a source. Then avoid all of it.
- **Time the beats.** A word is on screen by 0.2–0.7 s, and the product's name comes early (in the first 11 % of the
  film) or right after the problem act. The end card runs 4.4–6.3 s and holds still for about 2 s
  ([structure](research/launch-video-structure.md)).
- **Write the on-screen line as it will appear.** Big type, at most about 8 words per card, with `\n` where it breaks.
  One word per title takes the accent: mark it `*like this*`.
- **Every line needs a source** in the last column, or a note that it is illustrative. Those sources become
  `CLAIMS.md` ([claims](claims.md)).
- **Lengths.** A hook loop is 6–12 s. A feature clip is 20–30 s. A launch or argument film is 45–60 s.

## Template
Copy this into `films/<film>/brief.md` and fill every section. Delete the hints.

```markdown
# Brief: <film>

**Audience:** who watches, where (feed, site, conference screen) and what they already know.
**Promise:** the one sentence they should remember.
**Tone:** three adjectives, plus one film or brand it should feel like.
**This audience trusts:** e.g. primary sources, a stated limit, real UI, numbers with dates.
**This audience rolls its eyes at:** e.g. "AI-powered", stock footage, a claim with no source, a competitor bashed by name.
**Length and formats:** e.g. 30 s; 16:9, 1:1, 4:5, 9:16. A hook: 9:16 only, looped.
**Register:** e.g. product UI, statement, argument with infographics, hook loop.
**Ends on:** the end card's claim and call to action (URL).

## Beats
| # | t (s) | picture | on screen | notes/source |
|---|---|---|---|---|
| 1 | 0.0–3.0 | `title` on ink, blur entrance | Your inbox, *sorted*. | the promise; product homepage H1 |
| 2 | 3.0–9.0 | `ui`: the inbox rebuilt; cursor drags a mail to Later | Later | label from the app's code: `src/inbox/actions.ts` |
| … | | | | |
| n | 24.0–30.0 | `endcard` | Try it free. · example.com | pricing page, read <date> |

## Sources
- Each source with its title, date and URL. Numbers keep their research tag ([M], [P], [E], [C], [U], [D]).

## Do not use
- Numbers, words and pictures that would sink the film with this audience: the research pass's keep-off-screen list,
  competitor names and logos, claims the product can't back yet.
```

The picture column names the kit scene (`npx filmkit scenes`) or the film's own composition. The on-screen column is
the exact text, not a summary.

## Owner corrections
When the owner changes direction mid-build, don't edit the beats in place. Append a section:

```markdown
## Owner correction, 2026-11-11
We're not against data centres; data centres on the network are welcome. Beat 6 becomes "Data centres welcome."
```

A correction overrides everything above it. Re-read the whole brief, update the beats that it touches, then update
`CLAIMS.md` and the film. The brief keeps the history of what changed and why.
