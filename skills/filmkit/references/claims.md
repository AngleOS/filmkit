# Claims

`CLAIMS.md`, at the studio's root, is the ledger of every word any film shows, with the source a reviewer checks it
against. Write a film's rows as you write its beats, not after the render.

## Format
One section per film, with a short note on what the film may and may not say, then a table:

```markdown
## launch

The capability lines are the product's claims file, word for word. No prices: they aren't public yet.

| On screen | Kind | Source |
|---|---|---|
| Your inbox, sorted. | claim | homepage H1 (`site/src/pages/index.tsx`) |
| Later · Archive · Snooze | UI | `app/src/inbox/actions.ts` |
| Plan a trip to Lisbon | example | illustrative; no product claim |
| 23% of metered electricity, 2025 | number | [M] CSO Ireland, 7 Jul 2026, https://… (table 1) |
| 2,000,000 homes each | number | [D] IEA 2025: 100,000 households × 20, https://… |
| Share it with your team. | claim | ⚑ team sharing ships in 2.0; post once it's live |
```

- **On screen:** the exact text, with `·` between pieces shown together. Include UI labels, chart labels and source
  lines.
- **Kind:** `claim`, `number`, `chart`, `UI`, `example` (illustrative content), `brand`, `cta`, `source line` or
  `about other apps`. A `cta`'s verb must be true of the offer ("Get it", not "Try it free" without a trial).
- **Source:** a file and line in the product's code, a URL with its date, or "illustrative". Numbers keep their
  research tag ([research](research.md)). A derived number shows its working.

## Rules
- **Product and capability lines are word for word** from the product's own claims: its claims file, docs or site.
  A short on-screen line may cut a sentence to its point, but it never changes what the sentence says. The full
  sentence then goes in the post copy.
- **UI labels come from the product's code**, never from memory or a screenshot of an old build.
- **⚑ marks a line that isn't true yet**, or one that waits on an owner decision. Say what it waits on. A ⚑ row
  holds back public posting, not making the film: you can build and render a film "for when it's live".
- **A film isn't posted** while any of its rows is ⚑, or while a source has changed since the render.
- **Examples are marked as examples.** A made-up chat, an invented company or a sample number is fine on screen when
  the row says it's illustrative.
- **Other companies:** no names or logos in the picture. A source line may name them in small type, and the row says
  so.
