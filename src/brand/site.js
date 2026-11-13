// A brand read from its website (Design §8): the page, the stylesheets it links and the logo it shows, nothing more,
// and only where the site's robots.txt lets filmkit in. What it finds is a proposal, each part from the most telling
// place that has one: the flags given beside --from-url override it, and what isn't found is left to them.
import { fail } from "../errors.js";
import { contrast } from "../contrast.js";
import { hex, hsl } from "./palette.js";
import { request } from "./web.js";

/** Enough of a site's CSS to find its colours and type, without crawling a bundle split into dozens of files. */
const STYLESHEETS = 8;
/** A code font's name: the theme keeps its own mono, and the site's font is for titles and text. */
const CODE = /mono|code/i;

/**
 * @typedef {{ data: Uint8Array, from: string }} Logo `from` where it was found, to say so
 * @typedef {{ url: string, logo?: Logo, accent?: string, ground?: "dark" | "light", font?: string, missing: string[] }} Site
 *   `url` the page read, after redirects; `missing` the parts it has no answer for
 * @typedef {Record<string, string>[]} Tags each tag's attributes
 */

/**
 * @param {string} address the site, with or without https://
 * @param {typeof fetch} [get]
 * @returns {Promise<Site>}
 */
export async function readSite(address, get = fetch) {
  const asked = new URL(/^https?:\/\//.test(address) ? address : `https://${address}`);
  await allowed(asked, get);
  const answer = await request(get, asked, "site_fetch");
  if (!answer.ok) throw fail("site_fetch", { url: asked.href, reason: `HTTP ${answer.status}` });
  const page = new URL(answer.url || asked.href);
  const html = await answer.text();
  const links = tags(html, "link");
  // A Google Fonts stylesheet says no more than its link does: the family is in the link's URL.
  const sheets = links.filter((l) => /\bstylesheet\b/i.test(l.rel ?? "") && l.href && !l.href.includes("fonts.googleapis.com")).slice(0, STYLESHEETS);
  const fetched = await Promise.all(sheets.map(async (l) => {
    const sheet = await request(get, new URL(l.href, page), "site_fetch").catch(() => undefined);
    return sheet?.ok ? sheet.text() : "";
  }));
  const css = [...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]), ...fetched].join("\n");
  const props = customProperties(css);
  const logo = await findLogo(html, links, page, get);
  const svg = logo && !isPng(logo.data) ? new TextDecoder().decode(logo.data) : "";
  const found = { logo, accent: findAccent(html, links, props, svg), ground: findGround(css, props), font: findFont(html, css, props) };
  const missing = Object.entries(found).filter(([, v]) => !v).map(([k]) => k);
  return { url: page.href, ...Object.fromEntries(Object.entries(found).filter(([, v]) => v)), missing };
}

/**
 * Whether robots.txt lets filmkit read `page`: the rules for filmkit if it names it, else those for every agent, the
 * longest matching path deciding. No robots.txt lets everyone in.
 * @param {URL} page
 * @param {typeof fetch} get
 */
async function allowed(page, get) {
  const answer = await request(get, new URL("/robots.txt", page), "site_fetch");
  if (!answer.ok) return;
  if (!permits(await answer.text(), page.pathname + page.search)) throw fail("site_robots", { url: page.href });
}

/**
 * @param {string} robots robots.txt
 * @param {string} path
 */
export function permits(robots, path) {
  /** @type {{ agents: string[], rules: { allow: boolean, path: string }[] }[]} */
  const groups = [];
  let agentLine = false;
  for (const line of robots.split(/\r?\n/)) {
    const [, key = "", value = ""] = line.replace(/#.*/, "").trim().match(/^([\w-]+)\s*:\s*(.*)$/) ?? [];
    const field = key.toLowerCase();
    if (field === "user-agent") {
      if (!agentLine) groups.push({ agents: [], rules: [] });
      groups[groups.length - 1].agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && groups.length && value) {
      groups[groups.length - 1].rules.push({ allow: field === "allow", path: value });
    }
    if (key) agentLine = field === "user-agent";
  }
  const group = groups.find((g) => g.agents.includes("filmkit")) ?? groups.find((g) => g.agents.includes("*"));
  const matching = (group?.rules ?? []).filter((r) => robotsPattern(r.path).test(path));
  const longest = matching.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow))[0];
  return longest?.allow ?? true;
}

/** A robots.txt path as a pattern: `*` any run of characters, a final `$` the end. @param {string} path */
const robotsPattern = (path) =>
  new RegExp(`^${path.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\?\$$/, "$")}`);

/**
 * The logo, from the likeliest place first: an SVG in the page's header, drawn inline or linked, the one that says
 * "logo" before the first; then an SVG icon, the Apple touch icon, and the page's share image if it's a PNG.
 * @param {string} html
 * @param {Tags} links
 * @param {URL} page
 * @param {typeof fetch} get
 * @returns {Promise<Logo | undefined>}
 */
async function findLogo(html, links, page, get) {
  const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? "";
  // A sprite's <use> draws nothing once it's out of the page that holds the sprite.
  const inline = [...header.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)].filter((m) => !/<use\b/i.test(m[0]));
  const images = [...header.matchAll(/<img\b[^>]*>/gi)].filter((m) => /\.svg\b/i.test(attributes(m[0]).src ?? ""));
  /** @type {{ at: number, svg?: string, src?: string }[]} */
  const inHeader = [...inline.map((m) => ({ at: m.index ?? 0, svg: m[0] })), ...images.map((m) => ({ at: m.index ?? 0, src: attributes(m[0]).src }))];
  inHeader.sort((a, b) => Number(saysLogo(header, b.at)) - Number(saysLogo(header, a.at)) || a.at - b.at);
  const icons = links.filter((l) => /\bicon\b/i.test(l.rel ?? "") && (/\.svg\b/i.test(l.href ?? "") || l.type === "image/svg+xml"));
  const touch = links.filter((l) => /apple-touch-icon/i.test(l.rel ?? ""));
  const share = tags(html, "meta").filter((m) => m.property === "og:image" && /\.png\b/i.test(m.content ?? ""));
  /** @type {{ svg?: string, src?: string, from: string }[]} */
  const candidates = [
    ...inHeader.map((c) => ({ ...c, from: "the page's header" })),
    ...icons.map((l) => ({ src: l.href, from: "its SVG icon" })),
    ...touch.map((l) => ({ src: l.href, from: "its touch icon" })),
    ...share.map((m) => ({ src: m.content, from: "its share image" })),
  ];
  for (const candidate of candidates) {
    if (candidate.svg) return { data: new TextEncoder().encode(standalone(candidate.svg)), from: candidate.from };
    const answer = await request(get, new URL(candidate.src ?? "", page), "site_fetch").catch(() => undefined);
    if (!answer?.ok) continue;
    const data = new Uint8Array(await answer.arrayBuffer());
    if (isPng(data) || /<svg[\s>]/.test(new TextDecoder().decode(data))) return { data, from: candidate.from };
  }
  return undefined;
}

/** Whether the markup just before `at`, or the tag there, names a logo or the home link. @param {string} html @param {number} at */
const saysLogo = (html, at) => /logo|brand|home/i.test(html.slice(Math.max(0, at - 300), html.indexOf(">", at) + 1));

/** An inline SVG as a file of its own: the namespace a page's HTML lets it leave out. @param {string} svg */
const standalone = (svg) => (/\bxmlns=/.test(svg) ? svg : svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"'));

/** @param {Uint8Array} data */
const isPng = (data) => new TextDecoder().decode(data.subarray(1, 4)) === "PNG";

/**
 * The accent: a colour the CSS names for the brand (--brand, --primary, --accent…), else the browser's theme colour
 * or the pinned-tab icon's, else the logo's most used. Greys, near-blacks and near-whites are passed over: a brand's
 * accent is a colour, and a site's theme colour is often its header's white.
 * @param {string} html
 * @param {Tags} links
 * @param {Record<string, string>} props
 * @param {string} svg the logo, when it's an SVG
 */
function findAccent(html, links, props, svg) {
  const named = Object.entries(props).filter(([name]) => /brand|primary|accent/i.test(name)).map(([, value]) => value);
  const meta = tags(html, "meta").filter((m) => /^(theme-color|msapplication-TileColor)$/i.test(m.name ?? "")).map((m) => m.content ?? "");
  const mask = links.filter((l) => /mask-icon/i.test(l.rel ?? "")).map((l) => l.color ?? "");
  const fills = [...svg.matchAll(/(?:fill|stroke|stop-color)\s*[=:]\s*["']?(#[0-9a-f]{3,8}|rgba?\([^)]*\))/gi)].map((m) => m[1]);
  const byUse = [...new Set(fills)].sort((a, b) => fills.filter((f) => f === b).length - fills.filter((f) => f === a).length);
  return [...named, ...meta, ...mask, ...byUse].map((v) => cssColour(v, props)).find((c) => c && isColourful(c));
}

/** @param {string} colour */
function isColourful(colour) {
  const [, s, l] = hsl(colour);
  return s >= 0.3 && l >= 0.12 && l <= 0.9;
}

/**
 * The ground the site stands on: light or dark, from its background colour, in a custom property or on html or body.
 * @param {string} css
 * @param {Record<string, string>} props
 * @returns {"dark" | "light" | undefined}
 */
function findGround(css, props) {
  const named = Object.entries(props).filter(([name]) => /^--(color-)?(background|bg|canvas)$/i.test(name)).map(([, v]) => v);
  const rules = [...css.matchAll(/(?:^|[},\s])(?:html|body)\s*\{([^}]*)\}/gi)].map((m) => m[1].match(/background(?:-color)?\s*:\s*([^;]+)/i)?.[1] ?? "");
  const colour = [...named, ...rules].map((v) => cssColour(v, props)).find(Boolean);
  if (!colour) return undefined;
  return contrast(colour, "#000000") > contrast(colour, "#ffffff") ? "light" : "dark";
}

/**
 * The family the site sets its text in: a Google Fonts link's, else body's, else its first @font-face's, passing over
 * code fonts.
 * @param {string} html
 * @param {string} css
 * @param {Record<string, string>} props
 */
function findFont(html, css, props) {
  const links = [...`${html}\n${css}`.matchAll(/fonts\.googleapis\.com\/css2?\?[^"')\s]+/g)].map((m) => m[0].replace(/&amp;/g, "&"));
  const families = links.flatMap((l) => [...l.matchAll(/family=([^&:]+)/g)].map((m) => decodeURIComponent(m[1].replace(/\+/g, " "))));
  const google = families.find((f) => !CODE.test(f));
  if (google) return google;
  const body = [...css.matchAll(/(?:^|[},\s])(?:html|body)\s*\{([^}]*)\}/gi)].map((m) => m[1].match(/font-family\s*:\s*([^;]+)/i)?.[1]).find(Boolean);
  const face = css.match(/@font-face\s*\{[^}]*font-family\s*:\s*([^;}]+)/i)?.[1];
  const family = [body, face]
    .map((f) => f && resolve(f, props).split(",")[0].trim().replace(/^["']|["']$/g, ""))
    .find((f) => f && !CODE.test(f) && !/^(inherit|initial|system-ui|sans-serif|serif|-apple-system)$/i.test(f));
  // Next.js renames a family it hosts to __Inter_6c3f8b; the name is the family's. Google Fonts' names are in title
  // case, and a site's CSS may not be: "inter" is Inter.
  const name = family?.replace(/^__(.+?)_[0-9a-f]{6}$/, "$1").replace(/_/g, " ");
  return name === name?.toLowerCase() ? name?.replace(/\b\w/g, (c) => c.toUpperCase()) : name;
}

/**
 * The custom properties the CSS sets, the first of each name winning: a site's own values come first, and a dark
 * scheme or a component's overrides after them.
 * @param {string} css
 * @returns {Record<string, string>}
 */
function customProperties(css) {
  return Object.fromEntries([...css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)].reverse().map((m) => [m[1], m[2].trim()]));
}

/** `value` with its var()s put in, a few levels deep. @param {string} value @param {Record<string, string>} props */
function resolve(value, props) {
  let out = value;
  for (let depth = 0; depth < 5 && out.includes("var("); depth++) {
    out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, name, fallback) => props[name] ?? fallback ?? "");
  }
  return out;
}

/**
 * A CSS colour as #rrggbb: hex, rgb(), hsl() or oklch(), after its var()s; anything else, undefined.
 * @param {string} value
 * @param {Record<string, string>} props
 * @returns {string | undefined}
 */
export function cssColour(value, props = {}) {
  const v = resolve(value, props).trim().toLowerCase().replace(/\s*!important$/, "");
  const hexDigits = v.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/)?.[1];
  if (hexDigits) return `#${(hexDigits.length < 6 ? [...hexDigits].map((d) => d + d).join("") : hexDigits).slice(0, 6)}`;
  const [, fn, args = ""] = v.match(/^(rgba?|hsla?|oklch)\(([^)]*)\)$/) ?? [];
  const n = args.split(/[\s,/]+/).filter(Boolean).map((a) => ({ value: parseFloat(a), percent: a.endsWith("%") }));
  if (n.length < 3 || n.slice(0, 3).some((x) => Number.isNaN(x.value))) return undefined;
  if (fn?.startsWith("rgb")) return toHex(n.slice(0, 3).map((x) => (x.percent ? x.value * 2.55 : x.value)));
  if (fn?.startsWith("hsl")) return hex(n[0].value, n[1].value / 100, n[2].value / 100);
  if (fn === "oklch") return toHex(oklch(n[0].percent ? n[0].value / 100 : n[0].value, n[1].percent ? n[1].value * 0.004 : n[1].value, n[2].value));
  return undefined;
}

/** @param {number[]} rgb 0–255 */
const toHex = (rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;

/**
 * OKLCH to sRGB, 0–255, by Björn Ottosson's OKLab matrices (https://bottosson.github.io/posts/oklab/).
 * @param {number} l @param {number} c @param {number} h degrees
 */
function oklch(l, c, h) {
  const [a, b] = [c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];
  const [lms1, lms2, lms3] = [l + 0.3963377774 * a + 0.2158037573 * b, l - 0.1055613458 * a - 0.0638541728 * b, l - 0.0894841775 * a - 1.291485548 * b].map((x) => x ** 3);
  const linear = [
    4.0767416621 * lms1 - 3.3077115913 * lms2 + 0.2309699292 * lms3,
    -1.2684380046 * lms1 + 2.6097574011 * lms2 - 0.3413193965 * lms3,
    -0.0041960863 * lms1 - 0.7034186147 * lms2 + 1.707614701 * lms3,
  ];
  return linear.map((x) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(0, x) ** (1 / 2.4) - 0.055));
}

/** @param {string} html @param {string} name @returns {Tags} */
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => attributes(m[0]));

/** A tag's attributes, names in lower case, `&amp;` undone. @param {string} tag @returns {Record<string, string>} */
function attributes(tag) {
  const pairs = [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)];
  return Object.fromEntries(pairs.map((m) => [m[1].toLowerCase(), (m[2] ?? m[3] ?? m[4]).replace(/&amp;/g, "&")]));
}
