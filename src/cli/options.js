// Options every command takes, before or after the command's name. In a module of their own so the docs' test can
// parse a command as the CLI does without running it.
export const GLOBAL = { json: { type: /** @type {const} */ ("boolean") }, studio: { type: /** @type {const} */ ("string") } };
