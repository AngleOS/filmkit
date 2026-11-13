// The brand's typeface, from Google Fonts. Every family there is under the OFL, Apache 2.0 or the Ubuntu Font Licence,
// so its files may ship in the studio, with the licence beside them (Constraints: only redistributable assets). The
// css2 API is asked as a plain client, not a browser: it answers with one whole TrueType file per weight, where a
// browser gets woff2 cut into unicode-range subsets, and a film's text can be in any script the family covers.
import { fail } from "../errors.js";
import { request } from "./web.js";

const CSS = "https://fonts.googleapis.com/css2";
const LICENCES = "https://raw.githubusercontent.com/google/fonts/main";
/** Body text, labels, titles and bold. A family without one of them answers with the weights it has. */
const WEIGHTS = [400, 500, 600, 700];
/** Where google/fonts keeps a family's licence, by licence. */
const LICENCE_FILES = ["ofl/OFL.txt", "apache/LICENSE.txt", "ufl/UFL.txt"];
/** What follows the family's name in a file googleFont saves: a weight, or one of those licences. */
const SAVED = /^-(\d+\.\w+|OFL\.txt|LICENSE\.txt|UFL\.txt)$/;

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
  const answer = await request(get, url, "font_fetch");
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
    const file = await request(get, src, "font_fetch");
    if (!file.ok) throw fail("font_fetch", { url: src, reason: `HTTP ${file.status}` });
    faces.push({ weight, file: `${fileName(name)}-${weight}${src.match(/\.\w+$/)?.[0] ?? ".ttf"}`, bytes: new Uint8Array(await file.arrayBuffer()) });
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
    const answer = await request(get, `${LICENCES}/${dir}/${slug}/${file}`, "font_fetch");
    // Named for the family: the build copies each theme folder over its base's, and the base's fonts/OFL.txt is the
    // licence of the mono font it still ships.
    if (answer.ok) return { file: `${fileName(family)}-${file}`, text: await answer.text() };
  }
  return undefined;
}

/** How a family starts the names of the files it's saved as: "IBM Plex Sans" as IBMPlexSans-600.ttf. @param {string} family */
const fileName = (family) => family.replace(/\s+/g, "");

/**
 * Whether `file` in brand/theme/fonts is one googleFont saved for `family`: a weight or the licence. Files of a font
 * added by hand stay when --font replaces the family.
 * @param {string} family
 * @param {string} file
 */
export const savedFor = (family, file) => file.startsWith(fileName(family)) && SAVED.test(file.slice(fileName(family).length));

/**
 * Open families on Google Fonts drawn like the licensed ones sites most often use, to name in their place: filmkit can
 * copy only an open font, and a guess at the nearest is more help than none.
 */
const OPEN_MATCHES = /** @type {const} */ ([
  [/helvetica|arial|graphik|söhne|soehne|sf pro|san francisco|segoe|suisse|untitled sans|aktiv/i, "Inter"],
  [/circular|gt walsheim|cera|averta|sofia pro|product sans|google sans/i, "DM Sans"],
  [/proxima nova|gotham|brandon/i, "Montserrat"],
  [/futura|avenir|century gothic|twentieth century/i, "Jost"],
  [/gt america|founders grotesk|neue haas|aeonik|basis grotesque|apercu/i, "Inter Tight"],
  [/garamond|caslon|tiempos|georgia|times|freight text|lyon/i, "EB Garamond"],
]);

/** The open family most like `family`, or undefined when filmkit has no guess. @param {string} family */
export const openMatch = (family) => OPEN_MATCHES.find(([like]) => like.test(family))?.[1];
