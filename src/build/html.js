// Just enough HTML reading for a film's master: its start tags and their attributes. Films are written by agents and
// the kit, not scraped from the web, so a tag scanner is enough and keeps filmkit free of a parser dependency.

// An unquoted value can't start with a quote, so the value alternatives never overlap: overlapping ones backtrack
// exponentially on a malformed tag.
const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s"'=<>/`]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR = /([^\s"'=<>/`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
// Comments and script or style bodies are blanked, not removed, so tag positions stay true to the page.
const OPAQUE = /<!--[\s\S]*?-->|(<(?:script|style)\b[^>]*>)([\s\S]*?)(?=<\/(?:script|style)>)/gi;
const ENTITY = /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi;
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** @typedef {{ name: string, attrs: Record<string, string>, index: number, source: string }} StartTag */

/** @param {string} s */
const decode = (s) =>
  s.replace(ENTITY, (_, e) =>
    e[0] !== "#" ? NAMED[/** @type {keyof NAMED} */ (e.toLowerCase())]
      : String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)));

/** @param {string} html */
const blank = (html) =>
  html.replace(OPAQUE, (all, open, body) => (open ? open + " ".repeat(body.length) : " ".repeat(all.length)));

/**
 * Every start tag in the page, in order, with its attributes decoded.
 * @param {string} html
 * @returns {StartTag[]}
 */
export function startTags(html) {
  return [...blank(html).matchAll(TAG)].map((m) => ({
    name: m[1].toLowerCase(),
    attrs: Object.fromEntries([...m[2].matchAll(ATTR)].map((a) => [a[1], decode(a[2] ?? a[3] ?? a[4] ?? "")])),
    index: /** @type {number} */ (m.index),
    source: m[0],
  }));
}

/**
 * The film's root composition: the element with data-composition-id="main".
 * @param {string} html
 */
export function rootTag(html) {
  const root = startTags(html).find((t) => t.attrs["data-composition-id"] === "main");
  if (!root) throw new Error('index.html has no data-composition-id="main" root');
  return root;
}

/**
 * The page with the root composition sized for a format; everything else is untouched.
 * @param {string} html
 * @param {number} width
 * @param {number} height
 */
export function setRootSize(html, width, height) {
  const root = rootTag(html);
  let tag = root.source;
  for (const [name, value] of [["data-width", width], ["data-height", height]]) {
    const attr = new RegExp(`(\\s${name}\\s*=\\s*)("[^"]*"|'[^']*'|[^\\s"'=<>\`]+)`);
    tag = attr.test(tag) ? tag.replace(attr, `$1"${value}"`) : tag.replace(/\s*\/?>$/, ` ${name}="${value}"$&`);
  }
  return html.slice(0, root.index) + tag + html.slice(root.index + root.source.length);
}

/**
 * The page with `src` mounted as the film's sound: an <audio> spanning the root, its first child, on a Studio lane of
 * its own. A master that already mounts `src` is left as it is.
 * @param {string} html
 * @param {string} src
 */
export function mountAudio(html, src) {
  const tags = startTags(html);
  if (tags.some((t) => t.attrs.src === src)) return html;
  const root = rootTag(html);
  const lane = Math.max(0, ...tags.map((t) => +t.attrs["data-track-index"] || 0)) + 1;
  const audio = `\n<audio id="sound" class="clip" src="${src}" data-start="0" data-duration="${root.attrs["data-duration"]}" data-track-index="${lane}" data-volume="1"></audio>`;
  const at = root.index + root.source.length;
  return html.slice(0, at) + audio + html.slice(at);
}
