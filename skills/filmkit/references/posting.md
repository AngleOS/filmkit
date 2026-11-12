# Posting

`npx filmkit render <film>` writes `renders/<film>-<format>.mp4` (H.264 and AAC, 30 fps, −19 LUFS, peaks under −1
dBTP) and the film's captions as `renders/<film>.srt` and `.vtt`. One caption file serves every format, since they
share one timing.

**Renders never go into git** or into CI artifacts. Put them where the owner asked (a release, a bucket, a shared
folder) and say where in your report.

**Nothing is posted while the film has a ⚑ row in `CLAIMS.md`**, or before the end card's URL is live.

## Which format goes where
| Where | Format | Captions |
|---|---|---|
| YouTube | 16:9 | upload the `.srt` (Subtitles); set the thumbnail by hand |
| YouTube Shorts | 9:16 | upload the `.srt` |
| TikTok, Instagram Reels | 9:16 | they take no file: turn on their auto-captions and check them against the `.srt` |
| LinkedIn, Facebook feed | 4:5 | upload the `.srt` (Add captions) |
| Instagram feed | 4:5 | auto-captions, checked against the `.srt` |
| X | 16:9, or 1:1 for a phone-heavy audience | upload the `.srt` (Upload captions) |
| A web page | any | the `.vtt` as a `<track>` |

## POSTING.md
`POSTING.md`, at the studio's root, has one section per film:

```markdown
### launch (30 s, every format)
What the film shows, in two sentences. Cover: the frame at 4 s, the title over the inbox.

Post copy (the product's claims, word for word):

> Your inbox, sorted. Later, Archive and Snooze in one swipe. Free for personal use.
> https://example.com

Pinned reply, for "does it read my mail?": the product's privacy claim, word for word.

Waits on (CLAIMS.md ⚑): team sharing in 2.0.
```

- **Copy per platform** when they differ: YouTube gets a title and a description, X a short line, LinkedIn a
  paragraph.
- **The post copy carries the full sentence** that an on-screen line was cut from, with its conditions and caveats.
- **The cover** is a frame where the words are already on screen. `npx filmkit stills <film> <t>` writes a poster
  per format and a 1280 × 720 thumbnail.
- **A hook loop** has no URL on screen: the URL goes in the caption or a link sticker.

## Before posting
1. **Upload the file to each platform.** A YouTube link shared on X or LinkedIn reaches far fewer people.
2. **The first two seconds decide.** Open on something the viewer knows, with words already on screen.
3. **Feeds play muted.** The words on screen carry the film; the captions go up as files or auto-captions.
4. **Post at the same time everywhere and stay for the first hour.** Pin a reply to the obvious question.
5. **No copyright claims.** The sound is made by filmkit, so there's no third-party music to match.
