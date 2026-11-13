// filmkit brand's requests, to Google Fonts and to the brand's own site: one user agent, naming filmkit and where to
// read about it, so a site's owner can see what asked and why.
import { fail } from "../errors.js";

export const AGENT = "filmkit (+https://github.com/AngleOS/filmkit)";

/**
 * @param {typeof fetch} get
 * @param {string | URL} url
 * @param {string} code the catalogue's error for a request that fails, given `url` and `reason`
 */
export async function request(get, url, code) {
  try {
    return await get(String(url), { headers: { "user-agent": AGENT } });
  } catch (e) {
    // Node's fetch says only "fetch failed"; what failed (DNS, refused, offline) is in its cause.
    const error = /** @type {Error} */ (e);
    throw fail(code, { url: String(url), reason: String(error.cause ?? error.message) });
  }
}
