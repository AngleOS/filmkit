#!/usr/bin/env node
// The filmkit CLI. Each command is a module in commands/; this finds it, parses its options and prints its result.
// It never prompts (an agent can't answer), --json prints the result machine-readably, and a failure exits non-zero.
import { existsSync, readdirSync } from "node:fs";
import { parseArgs } from "node:util";
import { FilmkitError } from "../studio.js";

/**
 * @typedef {{ args: string[], options: Record<string, string | boolean | undefined>, json: boolean,
 *   log: (...lines: unknown[]) => void }} Context
 * @typedef {{ usage: string, summary: string, options?: import("node:util").ParseArgsConfig["options"],
 *   run: (ctx: Context) => Promise<{ ok: boolean }> }} Command
 */

const COMMANDS = new URL("commands/", import.meta.url);

async function help() {
  const names = readdirSync(COMMANDS).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3)).sort();
  /** @type {Command[]} */
  const commands = await Promise.all(names.map((n) => import(new URL(`${n}.js`, COMMANDS).href)));
  const width = Math.max(...commands.map((c) => c.usage.length));
  return ["usage: filmkit <command> [--json]", "", ...commands.map((c) => `  ${c.usage.padEnd(width)}  ${c.summary}`)].join("\n");
}

async function main() {
  const [name, ...rest] = process.argv.slice(2);
  if (!name || name === "help" || name === "--help" || name === "-h") {
    console.log(await help());
    return name ? 0 : 1;
  }
  const file = new URL(`${name}.js`, COMMANDS);
  if (!/^[a-z-]+$/.test(name) || !existsSync(file)) throw new FilmkitError(`unknown command "${name}"\n\n${await help()}`);
  /** @type {Command} */
  const command = await import(file.href);
  const { values, positionals } = parseArgs({
    args: rest,
    options: { json: { type: "boolean" }, ...command.options },
    allowPositionals: true,
  });
  const json = values.json === true;
  const result = await command.run({ args: positionals, options: values, json, log: json ? console.error : console.log });
  if (json) console.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(`filmkit: ${error instanceof FilmkitError || error.code?.startsWith("ERR_PARSE_ARGS") ? error.message : error.stack}`);
    if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  },
);
