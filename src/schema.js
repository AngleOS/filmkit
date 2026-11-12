// filmkit.json and theme.json are checked against schema/filmkit.schema.json, which editors can also read. This
// validates the keywords that schema uses, and nothing more, so the package needs no validator dependency. Each error
// names the key, what's wrong with its value and, from the schema's description, what it should be.
import { readFileSync } from "node:fs";

/**
 * @typedef {{ type?: string | string[], enum?: unknown[], pattern?: string, minimum?: number, maximum?: number,
 *   minItems?: number, items?: Schema, properties?: Record<string, Schema>, required?: string[],
 *   additionalProperties?: boolean | Schema, propertyNames?: Schema, $ref?: string, description?: string }} Schema
 */

/** @type {Schema & { $defs: Record<string, Schema> }} */
export const SCHEMA = JSON.parse(readFileSync(new URL("../schema/filmkit.schema.json", import.meta.url), "utf8"));

/**
 * The problems with `value` against the schema (the whole file's, or one of its $defs), as "key: problem" lines.
 * @param {unknown} value
 * @param {string} [def] a name in $defs
 * @param {string} [at] where the value sits, for the messages
 * @returns {string[]}
 */
export function validate(value, def, at = "") {
  return check(value, def ? SCHEMA.$defs[def] : SCHEMA, at);
}

/** @param {unknown} value @param {Schema} schema @param {string} at @returns {string[]} */
function check(value, schema, at) {
  const where = at || "the file";
  const why = schema.description ? ` (${schema.description})` : "";
  if (schema.$ref) {
    const problems = check(value, SCHEMA.$defs[schema.$ref.replace("#/$defs/", "")], at);
    if (problems.length) return problems;
  }
  const types = [schema.type ?? []].flat();
  if (types.length && !types.some((t) => t === typeOf(value) || (t === "number" && typeOf(value) === "integer"))) return [`${where}: ${show(value)} should be ${types.map(article).join(" or ")}${why}`];
  if (schema.enum && !schema.enum.includes(value)) return [`${where}: ${show(value)} should be one of ${schema.enum.join(", ")}`];
  if (typeof value === "string" && schema.pattern && !new RegExp(schema.pattern).test(value)) return [`${where}: ${show(value)} should be ${schema.description ?? `like ${schema.pattern}`}`];
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) return [`${where}: ${value} should be at least ${schema.minimum}`];
    if (schema.maximum !== undefined && value > schema.maximum) return [`${where}: ${value} should be at most ${schema.maximum}`];
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) return [`${where}: list at least ${schema.minItems}${why}`];
    return schema.items ? value.flatMap((item, i) => check(item, /** @type {Schema} */ (schema.items), `${at}[${i}]`)) : [];
  }
  return value && typeof value === "object" ? checkObject(/** @type {Record<string, unknown>} */ (value), schema, at) : [];
}

/** @param {Record<string, unknown>} value @param {Schema} schema @param {string} at @returns {string[]} */
function checkObject(value, schema, at) {
  const key = (/** @type {string} */ k) => (at ? `${at}.${k}` : k);
  const known = schema.properties ?? {};
  const missing = (schema.required ?? []).filter((k) => !(k in value)).map((k) => `${key(k)}: missing`);
  const problems = Object.entries(value).flatMap(([k, v]) => {
    if (schema.propertyNames && check(k, schema.propertyNames, "").length) return [`${key(k)}: should be ${schema.propertyNames.description ?? "another name"}`];
    if (known[k]) return check(v, known[k], key(k));
    if (schema.additionalProperties === false) return [`${key(k)}: unknown key${Object.keys(known).length ? ` (${Object.keys(known).join(", ")})` : ""}`];
    return typeof schema.additionalProperties === "object" ? check(v, schema.additionalProperties, key(k)) : [];
  });
  return [...missing, ...problems];
}

/** @param {unknown} value */
const typeOf = (value) => (Array.isArray(value) ? "array" : value === null ? "null" : Number.isInteger(value) ? "integer" : typeof value);
/** @param {unknown} value */
const show = (value) => (typeof value === "object" && value ? (Array.isArray(value) ? "a list" : "an object") : JSON.stringify(value));
/** @param {string} type */
const article = (type) => ({ array: "a list", object: "an object", integer: "a whole number", number: "a number", string: "a string", boolean: "true or false" })[type] ?? type;
