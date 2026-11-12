// Lighthouse (mobile) for the one page, served at SITE_ORIGIN: performance, best practices and SEO at 0.95 or more,
// accessibility at 1.0 (lighthouserc.json), each a median of the runs.
import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";

const origin = process.env.SITE_ORIGIN;
if (!origin) throw new Error("set SITE_ORIGIN to the running site, e.g. http://localhost:3000");
const chromePath = process.env.CHROME_PATH;
// Self-hosted CI runners are throwaway containers auditing our own localhost, so Chrome runs unsandboxed there.
const chromeFlags = process.env.CI ? "--headless=new --no-sandbox" : "--headless=new";
const lhci = (...args) => execFileSync("lhci", args, { stdio: "inherit" });

await rm(".lighthouseci", { recursive: true, force: true });
lhci(
  "collect",
  ...(process.env.LH_RUNS ? [`--numberOfRuns=${process.env.LH_RUNS}`] : []),
  `--url=${origin}/`,
  ...(chromePath ? [`--chromePath=${chromePath}`] : []),
  `--settings.chromeFlags=${chromeFlags}`,
);
// LH_PERF_WARN_ONLY: on a busy shared runner the CPU, not the page, decides the performance score.
lhci(
  "assert",
  ...(process.env.LH_PERF_WARN_ONLY ? ["--assertions.categories:performance=warn"] : []),
);
lhci("upload", "--outputDir=lighthouse-reports");
