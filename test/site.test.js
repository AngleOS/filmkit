// filmkit brand --from-url: the brand read from saved pages shaped like real sites (a logo drawn inline in the header,
// a site with only an icon, a Next.js app), the site's robots.txt kept to, and what it read written into a studio.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { openMatch } from "../src/brand/fonts.js";
import { cssColour, permits, readSite } from "../src/brand/site.js";
import { run as brand } from "../src/cli/commands/brand.js";
import { initStudio } from "../src/create.js";

const SITES = fileURLToPath(new URL("fixtures/sites/", import.meta.url));
const page = (/** @type {string} */ file) => readFileSync(join(SITES, file));
/** A PNG's signature and IHDR, 180 × 180: an Apple touch icon. */
const PNG = Buffer.alloc(33);
Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(PNG);
PNG.write("IHDR", 12, "latin1");
PNG.writeUInt32BE(180, 16);
PNG.writeUInt32BE(180, 20);

/**
 * A web of saved pages, by URL; anything else is a 404. The URLs asked for are kept, to look at.
 * @param {Record<string, string | Buffer>} pages
 */
function web(pages) {
  /** @type {string[]} */
  const asked = [];
  /** @type {typeof fetch} */
  const get = async (url) => {
    asked.push(String(url));
    const body = pages[String(url)];
    return body === undefined ? new Response("Not Found", { status: 404 }) : new Response(body);
  };
  return { get, asked };
}

const CAMP = {
  "https://camp.test/": page("camp.html"),
  "https://camp.test/assets/css/root.css?v=1.6": page("camp-root.css"),
  "https://camp.test/assets/css/fonts.css?v=1.6": page("camp-fonts.css"),
  "https://camp.test/assets/favicon.svg?v=1.6": page("camp-favicon.svg"),
};
const ROCKETS = {
  "https://rockets.test/": page("rockets.html"),
  "https://rockets.test/css/site.css": page("rockets.css"),
  "https://rockets.test/robots.txt": "User-agent: *\nDisallow: /admin/\n",
};

test("a site with its logo drawn in the header: that logo, the colour it names for the brand, its ground (not its dark scheme's) and its Google font (not its code font)", async () => {
  const { get, asked } = web(ROCKETS);
  const site = await readSite("rockets.test", get);
  assert.deepEqual([site.url, site.accent, site.ground, site.font, site.missing], ["https://rockets.test/", "#ff5a1f", "light", "IBM Plex Sans", []]);
  const logo = new TextDecoder().decode(site.logo?.data);
  // The one the header calls the logo, not the menu's icon before it, made a file of its own.
  assert.match(logo, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 120 32"/);
  assert.equal(site.logo?.from, "the page's header");
  // robots.txt first, then the page and the stylesheet it links; never Google's stylesheet, nor a page beyond.
  assert.deepEqual(asked, ["https://rockets.test/robots.txt", "https://rockets.test/", "https://rockets.test/css/site.css"]);
});

test("a site with only an icon: its SVG icon, the pinned-tab colour, an OKLCH ground through var()s, and a font Google doesn't have", async () => {
  const site = await readSite("https://camp.test/", web(CAMP).get);
  assert.deepEqual([site.accent, site.ground, site.font, site.logo?.from], ["#2377d2", "dark", "Sharpie", "its SVG icon"]);
  assert.equal(new TextDecoder().decode(site.logo?.data), readFileSync(join(SITES, "camp-favicon.svg"), "utf8"));
});

test("a Next.js app: its touch icon, --primary in hsl(), --background, and the family behind next/font's name", async () => {
  const { get } = web({
    "https://orbit.test/": page("next.html"),
    "https://orbit.test/_next/static/css/app.css": page("next.css"),
    "https://orbit.test/apple-touch-icon.png": PNG,
  });
  const site = await readSite("https://orbit.test", get);
  assert.deepEqual([site.accent, site.ground, site.font, site.logo?.from], ["#7c3bed", "dark", "Inter", "its touch icon"]);
});

test("what a site doesn't have is listed as missing, and a site that won't answer says so", async () => {
  const bare = await readSite("https://bare.test", web({ "https://bare.test/": "<html><head><title>Bare</title></head></html>" }).get);
  assert.deepEqual(bare.missing, ["logo", "accent", "ground", "font"]);
  // Google Fonts names a family in title case, as a site's CSS may not.
  const lower = await readSite("https://lower.test", web({ "https://lower.test/": "<style>body { font-family: inter, sans-serif }</style>" }).get);
  assert.equal(lower.font, "Inter");
  await assert.rejects(readSite("https://gone.test", web({}).get), { code: "site_fetch", message: /couldn't read https:\/\/gone\.test\/: HTTP 404/ });
});

test("robots.txt is kept to: filmkit's own rules first, else every agent's, the longest path deciding", async () => {
  assert.equal(permits("User-agent: *\nDisallow: /\n", "/"), false);
  assert.equal(permits("User-agent: *\nDisallow: /\n\nUser-agent: filmkit\nAllow: /\n", "/"), true);
  assert.equal(permits("User-agent: Googlebot\nDisallow: /\n", "/"), true);
  assert.equal(permits("User-agent: *\nDisallow: /docs/\nAllow: /docs/brand\n", "/docs/brand/"), true);
  assert.equal(permits("User-agent: *\nDisallow: /*.php$\n", "/index.php"), false);
  assert.equal(permits("User-agent: *\nDisallow:\n", "/"), true);
  const { get, asked } = web({ ...ROCKETS, "https://rockets.test/robots.txt": "User-agent: *\nDisallow: /\n" });
  await assert.rejects(readSite("https://rockets.test", get), { code: "site_robots" });
  assert.deepEqual(asked, ["https://rockets.test/robots.txt"]);
});

test("CSS colours: hex, rgb(), hsl() and oklch(), through var()s", () => {
  assert.deepEqual(
    ["#F50", "#ff5a1fcc", "rgb(255 90 31)", "rgba(255, 90, 31, .5)", "hsl(262 83% 58%)", "oklch(62.8% 0.2577 29.23)", "var(--x)", "currentColor"].map((c) => cssColour(c, { "--x": "#123456" })),
    ["#ff5500", "#ff5a1f", "#ff5a1f", "#ff5a1f", "#7c3bed", "#ff0000", "#123456", undefined],
  );
});

test("filmkit brand --from-url writes what the site gave, the flags beside it overriding", async (t) => {
  const dir = join(realpathSync(mkdtempSync(join(tmpdir(), "filmkit-site-"))), "acme-films");
  initStudio(dir, "Acme");
  const { get } = web(CAMP);
  // The site's font goes to Google Fonts as --font's would, which answers 400 for a family it hasn't.
  t.mock.method(globalThis, "fetch", async (/** @type {string} */ url) => (url.startsWith("https://fonts.googleapis.com/") ? new Response("", { status: 400 }) : get(url)));
  /** @type {string[]} */
  const lines = [];
  const result = await brand({ args: [], options: { studio: dir, "from-url": "camp.test", ground: "light" }, json: false, log: (line) => lines.push(String(line)) });
  assert.deepEqual([result.palette.accent, result.palette.ground, result.font], ["#2377d2", "light", undefined]);
  assert.deepEqual(result.site, { url: "https://camp.test/", logo: "its SVG icon", accent: "#2377d2", ground: "dark", font: "Sharpie" });
  assert.equal(readFileSync(join(dir, "brand", "logo.svg"), "utf8"), readFileSync(join(SITES, "camp-favicon.svg"), "utf8"));
  assert.equal(lines[0], "· from https://camp.test/: the logo, from its SVG icon, the accent #2377d2, a dark ground, the font Sharpie");
  assert.equal(lines[1], "· Sharpie isn't on Google Fonts, so filmkit can't copy it: the theme keeps its type; name an open font like it with --font");
});

test("a licensed font a site uses is named with the open font most like it, where filmkit knows one", () => {
  assert.deepEqual(["Graphik", "Circular Std", "Proxima Nova", "Futura PT", "Tiempos Text", "Sharpie"].map(openMatch), ["Inter", "DM Sans", "Montserrat", "Jost", "EB Garamond", undefined]);
});
