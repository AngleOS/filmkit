import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../../mcp/server.js";

export const usage = "mcp";
export const summary = "the MCP server over stdio: the commands as tools any agent can call (docs/mcp.md)";

/** @param {import("../index.js").Context} ctx */
export async function run({ options }) {
  // Stdout carries the protocol, so a stray line from anything the tools run goes to stderr instead.
  console.log = console.error;
  await createServer({ studio: /** @type {string | undefined} */ (options.studio) }).connect(new StdioServerTransport());
  // The client ends the session by closing the server's stdin.
  await new Promise((resolve) => process.stdin.once("end", resolve));
  return { ok: true };
}
