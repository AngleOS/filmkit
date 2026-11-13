// The MCP server: the CLI's operations as tools (kb/Interfaces.md § MCP tools). Each tool runs the command's own
// `run`, so a tool and its command can't drift apart; a FilmkitError becomes a tool error with the CLI's message.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isLoop } from "../build/seam.js";
import * as captions from "../cli/commands/captions.js";
import * as check from "../cli/commands/check.js";
import * as contact from "../cli/commands/contact.js";
import * as newFilm from "../cli/commands/new.js";
import * as render from "../cli/commands/render.js";
import * as scenes from "../cli/commands/scenes.js";
import * as snapshot from "../cli/commands/snapshot.js";
import * as stills from "../cli/commands/stills.js";
import { addClaim, readClaims } from "../claims.js";
import { templates } from "../create.js";
import { ffmpegOutput } from "../ffmpeg.js";
import { FORMATS, PACKAGE, filmNames, openFilm, openStudio, resolveFormats } from "../studio.js";
import { registerGuide } from "./guide.js";

/** A model reads an image up to this long side without its client scaling it down. */
const LONG_SIDE = 1568;
const MAX_TIMES = 12;

/**
 * @typedef {import("@modelcontextprotocol/sdk/types.js").CallToolResult} CallToolResult
 * @typedef {{ type: "image", data: string, mimeType: string }} Image
 * @typedef {import("@modelcontextprotocol/sdk/shared/protocol.js").RequestHandlerExtra<any, any>} Extra
 */

/**
 * The server, working on the studio in `studio` (the CLI's --studio), else the nearest one above the cwd, opened
 * afresh by each call so it sees the studio as it is now.
 * @param {{ studio?: string }} [options]
 */
export function createServer({ studio } = {}) {
  const { version } = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8"));
  const server = new McpServer({ name: "filmkit", title: "Angle Filmkit", version }, {
    instructions: "Angle Filmkit makes brand films in HTML: one master, laid out in 16x9, 9x16, 1x1 and 4x5. Make a film with new_film, build it from the scenes list_scenes gives, check_film it until it passes, and look at its frames with snapshot_film.",
  });
  const formats = z.enum(/** @type {[string, ...string[]]} */ (FORMATS));
  const film = z.string().describe("the film's name: its folder in films/");

  /**
   * Runs a CLI command as its tool: its log goes to stderr, as stdout carries the protocol.
   * @param {{ run: (ctx: import("../cli/index.js").Context) => Promise<import("../cli/index.js").Result> }} command
   * @param {string[]} args
   * @param {Record<string, string | boolean | undefined>} [options]
   * @param {Extra} [extra]  the request, for a long command to report its steps to as progress notifications
   * @returns {Promise<Record<string, unknown> & { ok: boolean }>}
   */
  const run = async (command, args, options = {}, extra) => {
    const live = extra && notifier(extra);
    const { exit, ...result } = await command.run({ args, options: { studio, ...options }, json: true, log: console.error, live });
    return result;
  };

  server.registerTool("list_films", {
    title: "List films",
    description: "The studio's films, each with its formats, whether it loops, and its length in seconds.",
  }, async () => {
    const open = openStudio(studio);
    const films = filmNames(open).map((name) => {
      try {
        const opened = openFilm(open, name);
        return { name, formats: resolveFormats(open, opened), loop: isLoop(opened.root), duration: +opened.root["data-duration"] };
      } catch (e) {
        return { name, error: /** @type {Error} */ (e).message };
      }
    });
    return json({ films });
  });

  const themes = readdirSync(join(PACKAGE, "themes")).sort().join(", ");
  server.registerTool("list_scenes", {
    title: "List scenes",
    description: `The kit's scenes and what each does, with the variables a film sets on it (defaults, options). A film mounts a scene with data-composition-src="kit/scenes/<name>.html". Its look comes from the studio's theme in filmkit.json: a built-in one (${themes}) or one that extends it; end cards carry "Made with Angle Filmkit" unless the theme sets "credit": false.`,
    inputSchema: { name: z.string().optional().describe("one scene, for only its entry") },
  }, async ({ name }) => json(await run(scenes, name === undefined ? [] : [name])));

  server.registerTool("new_film", {
    title: "New film",
    description: "Makes films/<name>/ from a template, with its brief and its placeholder rows (⚑) in CLAIMS.md. Write the brief and the claims next, then check_film.",
    inputSchema: {
      name: z.string().describe("the film's name: lower-case letters, digits and hyphens"),
      template: z.enum(/** @type {[string, ...string[]]} */ (templates())).optional().describe("statement when not given"),
    },
  }, async ({ name, template }) => json(await run(newFilm, [name], { template })));

  server.registerTool("check_film", {
    title: "Check film",
    description: "Builds the film's sound and checks each format (HyperFrames' lint, runtime, layout, motion and contrast passes, and a loop's seam), skipping formats unchanged since they passed. A failed check is a result, not an error: fix each finding, and look at its time with snapshot_film.",
    inputSchema: { film, formats: z.array(formats).optional().describe("the film's own formats when not given") },
  }, async ({ film, formats = [] }, extra) => json(await run(check, [film, ...formats], {}, extra)));

  server.registerTool("snapshot_film", {
    title: "Snapshot film",
    description: `Frames of one format at the times given, as images, so you can look at what the film shows. Up to ${MAX_TIMES} times.`,
    inputSchema: {
      film,
      format: formats.optional().describe("the film's first format when not given"),
      at: z.array(z.number().nonnegative()).min(1).max(MAX_TIMES).describe("times in seconds"),
    },
  }, async ({ film, format, at }) => {
    const result = await run(snapshot, format ? [film, format] : [film], { at: at.join(",") });
    const frames = /** @type {{ t: number, path: string }[]} */ (result.frames);
    return { content: [text(result), ...frames.map((f) => image(f.path))], isError: !result.ok };
  });

  server.registerTool("contact_sheet", {
    title: "Contact sheet",
    description: "One labelled sheet per format, as images: each scene just after it starts, or a frame every `every` seconds. The quickest look at a whole film.",
    inputSchema: { film, formats: z.array(formats).optional().describe("the film's own formats when not given"), every: z.number().positive().optional().describe("seconds between frames") },
  }, async ({ film, formats = [], every }) => {
    const result = await run(contact, [film, ...formats], { every: every === undefined ? undefined : String(every) });
    const sheets = /** @type {{ path: string }[]} */ (result.sheets);
    return { content: [text(result), ...sheets.map((s) => image(s.path))], isError: !result.ok };
  });

  server.registerTool("render_film", {
    title: "Render film",
    description: "Checks the film, then renders an MP4 per format at delivery quality into the studio's renders folder, with its .srt and .vtt captions, keeping MP4s that are still current. Reports its steps as progress notifications. A failed check is a result: fix it and render again.",
    inputSchema: { film, formats: z.array(formats).optional().describe("the film's own formats when not given") },
  }, async ({ film, formats = [] }, extra) => {
    const result = await run(render, [film, ...formats], {}, extra);
    return { ...json(result), isError: Array.isArray(result.failed) };
  });

  server.registerTool("captions", {
    title: "Captions",
    description: "Writes the film's captions scene as .srt and .vtt in the renders folder, and returns its lines.",
    inputSchema: { film },
  }, async ({ film }) => json(await run(captions, [film])));

  server.registerTool("stills", {
    title: "Stills",
    description: "Checks the film, then a poster PNG per format at one time, and a 1280×720 thumbnail from 16x9, in the renders folder.",
    inputSchema: { film, at: z.number().nonnegative().describe("the time in seconds") },
  }, async ({ film, at }, extra) => {
    const result = await run(stills, [film, String(at)], {}, extra);
    return { ...json(result), isError: Array.isArray(result.failed) };
  });

  server.registerTool("read_claims", {
    title: "Read claims",
    description: "The rows of the studio's CLAIMS.md: every word a film shows, its kind and its source. A flagged row (⚑) isn't true yet and holds back posting the film.",
    inputSchema: { film: film.optional().describe("one film, for only its rows") },
  }, async ({ film }) => json({ rows: readClaims(openStudio(studio), film) }));

  server.registerTool("add_claim", {
    title: "Add claim",
    description: "Appends a row to the film's table in CLAIMS.md, for a line that will be on screen. Product and capability lines are word for word from the product's own claims (filmkit://guide/claims-format).",
    inputSchema: {
      film,
      line: z.string().min(1).describe("the exact text on screen, with · between pieces shown together"),
      kind: z.string().optional().describe("claim (when not given), number, chart, UI, example, brand, cta, source line or about other apps"),
      source: z.string().min(1).describe("a file and line in the product's code, a URL with its date, or illustrative"),
      flag: z.boolean().optional().describe("true for a line that isn't true yet: say in the source what it waits on"),
    },
  }, async ({ film, line, kind = "claim", source, flag }) => {
    const open = openStudio(studio);
    openFilm(open, film);
    addClaim(open, { film, line, kind, source, flag });
    return json({ ok: true });
  });

  registerGuide(server);
  return server;
}

/** One notification a second at most while a step goes on: a render reports every frame. */
const NOTIFY_MS = 1000;

/**
 * A long command's steps as the request's progress notifications, when its client asked for them (a progressToken).
 * The count of steps is the progress, as it must only rise: a format's frames start again at each stage and format.
 * @param {Extra} extra
 * @returns {import("../progress.js").Progress}
 */
export function notifier({ _meta, sendNotification }, now = Date.now) {
  const token = _meta?.progressToken;
  let sent = 0;
  let last = { step: "", at: 0 };
  return {
    step(name, step, { done, total } = {}) {
      const at = now();
      if (token === undefined || (last.step === `${name} ${step}` && at - last.at < NOTIFY_MS)) return;
      last = { step: `${name} ${step}`, at };
      const message = `${name} ${step}${total ? ` frame ${done ?? 0}/${total}` : ""}`;
      sendNotification({ method: "notifications/progress", params: { progressToken: token, progress: ++sent, message } }).catch(() => {});
    },
    end() {},
    log: (...lines) => console.error(...lines),
    close() {},
  };
}

/** @param {unknown} result @returns {CallToolResult} */
const json = (result) => ({ content: [text(result)] });

/** @param {unknown} result @returns {{ type: "text", text: string }} */
const text = (result) => ({ type: "text", text: JSON.stringify(result, null, 2) });

/**
 * A PNG as image content, scaled down to LONG_SIDE when it's longer.
 * @param {string} path
 * @returns {Image}
 */
export function image(path) {
  const png = readFileSync(path);
  // A PNG's IHDR chunk, first in the file, holds its width and height.
  const long = Math.max(png.readUInt32BE(16), png.readUInt32BE(20));
  const fit = `scale=${LONG_SIDE}:${LONG_SIDE}:force_original_aspect_ratio=decrease:flags=lanczos`;
  const scaled = long > LONG_SIDE ? ffmpegOutput(["-i", path, "-vf", fit, "-f", "image2pipe", "-c:v", "png", "-"]) : null;
  return { type: "image", data: (scaled ?? png).toString("base64"), mimeType: "image/png" };
}
