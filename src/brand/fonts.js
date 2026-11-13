// The brand's typeface, from Google Fonts. Every family there is under the OFL, Apache 2.0 or the Ubuntu Font Licence,
// so its files may ship in the studio, with the licence beside them (Constraints: only redistributable assets). The
// css2 API is asked as a plain client, not a browser: it answers with one whole TrueType file per weight, where a
// browser gets woff2 cut into unicode-range subsets, and a film's text can be in any script the family covers.
import { fail } from "../errors.js";

const CSS = "https://fonts.googleapis.com/css2";
const LICENCES = "https://raw.githubusercontent.com/google/fonts/main";
const AGENT = "filmkit (+https://github.com/AngleOS/filmkit)";
/** Body text, labels, titles and bold. A family without one of them answers with the weights it has. */
const WEIGHTS = [400, 500, 600, 700];
/** Where google/fonts keeps a family's licence, by licence. */
const LICENCE_FILES = ["ofl/OFL.txt", "apache/LICENSE.txt", "ufl/UFL.txt"];

/**
 * @typedef {{ weight: number, file: string, bytes: Uint8Array }} Face `file` a name in brand/theme/fonts
 * @typedef {{ family: string, faces: Face[], licence?: { file: string, text: string } }} Font
 */

/**
 * The family's regular to bold, and its licence.
 * @param {string} family as Google Fonts names it, such as "Inter" or "IBM Plex Sans"
 * @param {typeof fetch} [get]
 * @returns {Promise<Font>}
 */
export async function googleFont(family, get = fetch) {
  const url = `${CSS}?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${WEIGHTS.join(";")}`;
  const answer = await request(get, url);
  if (answer.status === 400) throw fail("font_unknown", { family });
  if (!answer.ok) throw fail("font_fetch", { url, reason: `HTTP ${answer.status}` });
  const blocks = [...(await answer.text()).matchAll(/@font-face\s*{([^}]*)}/g)].map(([, block]) => ({
    family: block.match(/font-family:\s*'([^']+)'/)?.[1] ?? family,
    weight: Number(block.match(/font-weight:\s*(\d+)/)?.[1]),
    src: block.match(/url\((https:[^)]+)\)/)?.[1] ?? "",
  }));
  if (!blocks.length) throw fail("font_unknown", { family });
  const name = blocks[0].family;
  /** @type {Face[]} */
  const faces = [];
  for (const { weight, src } of blocks) {
    const file = await request(get, src);
    if (!file.ok) throw fail("font_fetch", { url: src, reason: `HTTP ${file.status}` });
    faces.push({ weight, file: `${name.replace(/\s+/g, "")}-${weight}${src.match(/\.\w+$/)?.[0] ?? ".ttf"}`, bytes: new Uint8Array(await file.arrayBuffer()) });
  }
  return { family: name, faces, licence: await licence(get, name) };
}

/**
 * The family's licence from google/fonts, which keeps each family in a folder named for it under its licence's.
 * @param {typeof fetch} get
 * @param {string} family
 */
async function licence(get, family) {
  const slug = family.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const path of LICENCE_FILES) {
    const [dir, file] = path.split("/");
    const answer = await request(get, `${LICENCES}/${dir}/${slug}/${file}`);
    if (answer.ok) return { file, text: await answer.text() };
  }
  return undefined;
}

/** @param {typeof fetch} get @param {string} url */
async function request(get, url) {
  try {
    return await get(url, { headers: { "user-agent": AGENT } });
  } catch (e) {
    // Node's fetch says only "fetch failed"; what failed (DNS, refused, offline) is in its cause.
    const error = /** @type {Error} */ (e);
    throw fail("font_fetch", { url, reason: String(error.cause ?? error.message) });
  }
}
