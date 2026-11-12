import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { InstallPath } from "@/components/install-tabs";

export const SITE_URL = "https://filmkit.anglehq.net/";
export const REPO_URL = "https://github.com/AngleOS/filmkit";
export const asset = (path: string) => `${process.env.SITE_BASE_PATH ?? ""}${path}`;

export const examples = [
  {
    id: "chart",
    title: "Infographic",
    note: "Bars drawn to scale, values rolling up, on the light Paper theme.",
    label:
      "Example film: 'Signups tripled this quarter.' Four bars rise in turn as their values roll up to 3.7k.",
    ratio: "16 / 9",
  },
  {
    id: "terminal",
    title: "Developer promo",
    note: "A terminal typed at reading speed, output line by line.",
    label:
      "Example film: 'One command. Every format.' A terminal runs npx filmkit render and lists four renders and the captions.",
    ratio: "16 / 9",
  },
  {
    id: "chat",
    title: "Product promo",
    note: "Product UI rebuilt from its own tokens, never screen-recorded.",
    label:
      "Example film: 'Your product, rebuilt.' A prompt is typed, sent, and the reply streams in.",
    ratio: "16 / 9",
  },
  {
    id: "hook",
    title: "9:16 hook",
    note: "Laid out for the vertical frame, not cropped from 16:9.",
    label:
      "Example film, vertical: 'Make it read on mute.' A counter ticks to 7 as seven of ten dots light up.",
    ratio: "9 / 16",
  },
] as const;

export const steps = [
  {
    tc: "00:00",
    title: "Brief",
    body: "Audience, promise, tone, and a beats table: time, picture, the line on screen, its source.",
  },
  {
    tc: "00:06",
    title: "Research",
    body: "Every number tagged measured, projected or contested, with a list of claims to keep off screen.",
  },
  {
    tc: "00:12",
    title: "Claims",
    body: "Every word on screen goes in a ledger with its source. Anything not true yet is flagged and held back.",
  },
  {
    tc: "00:18",
    title: "Build",
    body: "Kit scenes first: titles, product UI, infographics. The film's own compositions only where the kit stops.",
  },
  {
    tc: "00:24",
    title: "Check, then look",
    body: "Every format must pass. Then the agent reads contact sheets of its own frames and fixes what collides.",
  },
  {
    tc: "00:30",
    title: "Render",
    body: "16:9, 1:1, 4:5 and 9:16, with sound from the motion and captions as SRT and VTT files.",
  },
] as const;

export const tools = [
  ["new_film", "start from a template"],
  ["check_film", "every format, every rule"],
  ["snapshot_film", "frames back as images"],
  ["contact_sheet", "the whole film at a glance"],
  ["render_film", "four MP4s and captions"],
  ["add_claim", "a sourced line in the ledger"],
] as const;

export const agentApps = [
  "Claude Code",
  "Claude Desktop",
  "Codex",
  "Cursor",
  "VS Code with Copilot",
  "Windsurf",
  "Zed",
  "Gemini CLI",
  "opencode",
] as const;

export const kit = [
  {
    title: "Scenes with taste",
    body: "Title entrances, a logo reveal, end cards, lower thirds, chat, code and terminal. Each one moves by the same rules.",
  },
  {
    title: "Infographics that land",
    body: "Bars, counters, before-and-after stats, grids, cards and timelines, drawn to scale from your numbers.",
  },
  {
    title: "Sound from the motion",
    body: "Impacts, ticks and whooshes placed on the frames that move, over a tonal pad, mastered to −19 LUFS. No stock music.",
  },
  {
    title: "Captions as files",
    body: "SRT and VTT for every film, ready to upload as closed captions. Every film also reads on mute from its own type.",
  },
  {
    title: "Loops that seam",
    body: "Vertical hooks play forever: a seam check fails any loop whose last frame doesn't flow into its first.",
  },
  {
    title: "Your brand, Angle's eye",
    body: "Films start in Angle's look (Night, Pear, Geist, the brand lines) with your logo. Retheme everything in one file.",
  },
] as const;

const FALLBACK_PROMPT =
  "Install Angle Filmkit for me and set it up with my brand. Run `npx -y github:AngleOS/filmkit setup --yes --agents auto`, then ask me for my brand name, website and logo, set up the brand, make a first film, check it in every format, look at its contact sheet, and show me the renders. Docs: https://github.com/AngleOS/filmkit";

// The agent setup prompt is docs/install-with-your-agent.md's fenced block, read at build so the site and the repo
// never disagree.
export function agentPrompt(): string {
  const file = join(process.cwd(), "..", "docs", "install-with-your-agent.md");
  if (!existsSync(file)) return FALLBACK_PROMPT;
  const match = readFileSync(file, "utf8").match(/````text\n([\s\S]*?)\n````/);
  return match?.[1]?.trim() ?? FALLBACK_PROMPT;
}

export function installPaths(prompt: string): InstallPath[] {
  return [
    {
      id: "agent",
      tab: "Your agent",
      command: prompt,
      multiline: true,
      notes: [
        "Paste it into Claude Code, Codex, Cursor or any agent with a terminal.",
        "It installs Filmkit and wires it into every agent tool you use.",
        "It asks you for one thing: your brand. Name, website, logo.",
        "It ends with a first film, checked in every format, and shows you the frames.",
      ],
    },
    {
      id: "npx",
      tab: "npx",
      command: "npx -y github:AngleOS/filmkit setup",
      notes: [
        "Any OS with Node 20 or newer.",
        "A guided setup: agent tools, a studio, your brand, a first film.",
        "Add --yes to run it unattended.",
        "Installs straight from the GitHub repo, so it stays current.",
      ],
    },
    {
      id: "unix",
      tab: "macOS & Linux",
      command: "gh repo clone AngleOS/filmkit && sh filmkit/install.sh",
      notes: [
        "Installs Node and ffmpeg with Homebrew, apt, dnf or pacman if they're missing. It asks first.",
        "Then runs the guided setup.",
        "After launch, this becomes one curl line.",
        "Undo it any time with filmkit setup --remove.",
      ],
    },
    {
      id: "windows",
      tab: "Windows",
      command: "gh repo clone AngleOS/filmkit; .\\filmkit\\install.ps1",
      notes: [
        "Installs Node and ffmpeg with winget if they're missing. It asks first.",
        "Then runs the guided setup.",
        "Works in Windows Terminal and PowerShell 7.",
        "Undo it any time with filmkit setup --remove.",
      ],
    },
  ];
}
