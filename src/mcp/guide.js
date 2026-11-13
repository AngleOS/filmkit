// What the server teaches: the skill's references as resources, and the make_film prompt, the skill's workflow in
// steps that name the tools.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { templates } from "../create.js";
import { PACKAGE } from "../studio.js";

/** Each guide: its file in the package, and what it's for. */
const GUIDES = {
  "look-and-motion": ["skills/filmkit/references/look-and-motion.md", "The look and motion rules every frame follows: type, layout per format, motion, sound"],
  "brief-template": ["skills/filmkit/references/brief.md", "The brief every film starts from: audience, promise, tone, formats and the beats table"],
  "claims-format": ["skills/filmkit/references/claims.md", "CLAIMS.md: the format of its rows and the rules for what a film may say"],
  "review-checklist": ["skills/filmkit/references/review.md", "What to look for in a film's frames after check passes, and when it's done"],
  themes: ["docs/themes.md", "The studio's theme: the built-in angle, default and paper, a theme of its own, and the end card's credit"],
};

/** @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server */
export function registerGuide(server) {
  for (const [name, [file, description]] of Object.entries(GUIDES)) {
    const uri = `filmkit://guide/${name}`;
    server.registerResource(name, uri, { description, mimeType: "text/markdown" }, () => ({
      contents: [{ uri, mimeType: "text/markdown", text: readFileSync(join(PACKAGE, file), "utf8") }],
    }));
  }
  server.registerPrompt("make_film", {
    title: "Make a film",
    description: "Makes a film from a brief with Angle Filmkit's tools: brief, claims, build, check, look, render.",
    argsSchema: { brief: z.string().describe("what the film is for: its audience, its promise, and anything the owner has said") },
  }, ({ brief }) => ({ messages: [{ role: "user", content: { type: "text", text: makeFilm(brief) } }] }));
}

/** @param {string} brief */
export function makeFilm(brief) {
  return `Make a film from the brief below with Angle Filmkit's tools. Work through the steps in order.

1. **Brief.** Read filmkit://guide/brief-template. Pick a short name for the film and make it with new_film, choosing
   a template (${templates().join(", ")}). Write films/<film>/brief.md from the brief below: audience, promise, tone,
   formats and the beats table. When the brief leaves the promise or the beats open, draft them and ask the owner to
   confirm them before you build.
2. **Claims.** Read filmkit://guide/claims-format. read_claims for the film shows the template's ⚑ placeholder rows:
   replace them in CLAIMS.md as you write the film's lines, and add_claim every other line that will be on screen,
   with its source. A line that isn't true yet gets flag: true.
3. **Build.** list_scenes gives the kit's scenes and their variables. Edit films/<film>/index.html, never build/,
   following filmkit://guide/look-and-motion; the colours, fonts and logo come from the studio's theme
   (filmkit://guide/themes).
4. **Check, then look.** check_film until it passes in every format, looking at each finding's time with
   snapshot_film. Then contact_sheet, and fix what you see in every format (filmkit://guide/review-checklist).
5. **Render.** render_film writes the videos and their captions; stills makes a poster per format and a thumbnail.
   Say where the renders are, and which claims are still ⚑.

## The brief
${brief}
`;
}
