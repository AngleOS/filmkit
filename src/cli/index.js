#!/usr/bin/env node
// The filmkit CLI. Each command is a module in commands/; this finds it, parses its options and prints its result.
// It never prompts (an agent can't answer), --json prints one result object on stdout, and the exit code says what
// went wrong (kb/Interfaces.md): 1 a failed check, 2 a usage error, 3 a missing requirement, 4 a failed render.
import { existsSync, readdirSync } from "node:fs";
import { parseArgs } from "node:util";
import { FilmkitError, fail } from "../errors.js";
import { banner } from "./banner.js";

/**
 * @typedef {{ args: string[], options: Record<string, string | boolean | undefined>, json: boolean,
 *   log: (...lines: unknown[]) => void }} Context
 * @typedef {{ ok: boolean, exit?: number }} Result  `exit` is the code for a failure (1 when absent); it isn't printed
 * @typedef {{ usage: string, summary: string, options?: import("node:util").ParseArgsConfig["options"],
 *   run: (ctx: Context) => Promise<Result> }} Command
 */

const COMMANDS = new URL("commands/", import.meta.url);
/** Options every command takes, before or after the command's name. */
const GLOBAL = { json: { type: /** @type {const} */ ("boolean") }, studio: { type: /** @type {const} */ ("string") } };

async function help() {
  const names = readdirSync(COMMANDS).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3)).sort();
  /** @type {Command[]} */
  const commands = await Promise.all(names.map((n) => import(new URL(`${n}.js`, COMMANDS).href)));
  const width = Math.max(...commands.map((c) => c.usage.length));
  return [
    "usage: filmkit <command> [--json] [--studio dir]",
    "",
    ...commands.map((c) => `  ${c.usage.padEnd(width)}  ${c.summary}`),
  ].join("\n");
}

/** The command's name: the first argument that isn't an option or --studio's value. @param {string[]} argv */
function commandIndex(argv) {
  return argv.findIndex((a, i) => !a.startsWith("-") && argv[i - 1] !== "--studio");
}

async function main() {
  const argv = process.argv.slice(2);
  const at = commandIndex(argv);
  const name = argv[at];
  if (at < 0 || name === "help" || argv.includes("--help") || argv.includes("-h")) {
    console.log([banner(argv.includes("--json")), await help()].filter(Boolean).join("\n\n"));
    return at < 0 && !argv.includes("--help") && !argv.includes("-h") ? 2 : 0;
  }
  const file = new URL(`${name}.js`, COMMANDS);
  if (!/^[a-z-]+$/.test(name) || !existsSync(file)) throw fail("unknown_command", { command: name });
  /** @type {Command} */
  const command = await import(file.href);
  const { values, positionals } = parseOptions(name, command, argv.filter((_, i) => i !== at));
  const json = values.json === true;
  const { exit = 1, ...result } = await command.run({ args: positionals, options: values, json, log: json ? console.error : console.log });
  if (json) console.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : exit;
}

/** @param {string} name @param {Command} command @param {string[]} args */
function parseOptions(name, command, args) {
  try {
    return parseArgs({ args, options: { ...GLOBAL, ...command.options }, allowPositionals: true });
  } catch (e) {
    const { code, message } = /** @type {NodeJS.ErrnoException} */ (e);
    const option = message.match(/'(-[^' ]+)/)?.[1];
    if (code === "ERR_PARSE_ARGS_UNKNOWN_OPTION" && option) throw fail("unknown_option", { command: name, option });
    // A string option given no value, or a flag given one.
    const declared = option && { ...GLOBAL, ...command.options }[option.replace(/^--/, "")];
    if (code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE" && declared) throw fail("option_value", { command: name, option, takes: declared.type === "string" });
    throw e;
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    const ours = error instanceof FilmkitError;
    const usage = !ours && error.code?.startsWith("ERR_PARSE_ARGS");
    console.error(`filmkit: ${ours || usage ? error.message : error.stack}`);
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ ok: false, error: error.message, ...(ours && error.code && { code: error.code, fix: error.fix }) }));
    }
    process.exit(ours ? error.exit : usage ? 2 : 1);
  },
);
