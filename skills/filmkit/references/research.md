# Research

Run a research pass before the build when the film argues something, shows numbers, or speaks to a sceptical
audience. Skip it for a demo that only shows the product's own UI. The pass returns notes the brief and `CLAIMS.md`
are built from. When you can, give it to its own agent with the brief, and build only once it is back.

## What the pass returns
Write `films/<film>/research.md` with four sections:
1. **Claims, tagged.** Every number or fact the film might use, with its source and one tag:

   | Tag | Meaning | On screen? |
   |---|---|---|
   | **[M]** measured | counted or metered by the source: a census, a meter reading, a filed report | yes, with a source line |
   | **[P]** projected | a forecast by a named body | yes, said as a forecast ("by 2030") |
   | **[E]** estimate | a modelled or rounded figure | yes, said as an estimate ("about", "~") |
   | **[C]** contested | sources disagree, or the other side disputes it | no, unless the film is about the dispute |
   | **[U]** unverified | no primary source found | no |
   | **[D]** derived | your own arithmetic on sourced numbers (100,000 × 20) | yes; show the working in `CLAIMS.md` |

2. **What this audience finds credible**, and what makes them roll their eyes. This goes into the brief.
3. **Keep off screen.** Numbers that are popular but wrong, misquoted, out of date or only true with a caveat the
   film can't show. Name each one and say why it's out.
4. **The honest limit.** What the product doesn't do or doesn't fix. The film says it out loud.

## How to research
- **Go to the primary source.** Read the report, the filing or the dataset, not the article that quotes it. Quote the
  exact sentence and give the page or line.
- **Prefer admissions from the other side.** A critic believes the incumbent's own filing, a regulator or a market
  monitor more than your blog. A number your opponent published can't be waved away.
- **Prefer local, dated numbers.** "23% of Ireland's metered electricity in 2025 (CSO, 7 Jul 2026)" beats "a growing
  share of the world's power". Every number carries its date.
- **Read the method.** Note what was measured, when and on what. A study of 2024-era models is a measurement of
  those models, not of today's.
- **Use the source's own figure.** If the brief says "~10%" and the report assumes 20%, show 20% and say so. Err on
  the other side's side.
- **Check the same day for anything live.** Prices, speeds and counts change. Show them only if you read them on the
  day of the cut, and write that date down.

**One overclaim discredits every true number.** A sceptical viewer who catches one stretched figure stops trusting
the other nine. When in doubt, leave it off screen and put it in the post copy with its caveat, or drop it.

## Hand-off
The brief's sources and do-not-use list come from this pass. Every row that reaches the screen goes into `CLAIMS.md`
with its tag's caveat in the source column ([claims](claims.md)).
