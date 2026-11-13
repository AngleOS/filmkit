// `npm run docs`: writes the docs generated from the code. A test fails when one is stale.
import { writeFileSync } from "node:fs";
import { scenesMarkdown } from "../src/scenes.js";

writeFileSync(new URL("../docs/scenes.md", import.meta.url), scenesMarkdown());
