import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { agentApps, examples, steps } from "@/lib/content";
import Home from "./page";

describe("the one page", () => {
  it("has one h1 and section headings in order", () => {
    render(<Home />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      "Made with the kit. Every frame.",
      "A brief in. A film out.",
      "Your agent drives. It sees its own frames.",
      "Taste, built in.",
      "One line. Or one prompt.",
    ]);
  });

  it("shows the install command and every install path", () => {
    render(<Home />);
    expect(screen.getAllByText("npx -y github:AngleOS/filmkit setup").length).toBeGreaterThan(0);
    for (const tab of ["Your agent", "npx", "macOS & Linux", "Windows"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  it("gives every film a poster, a description and a pause control", () => {
    const { container } = render(<Home />);
    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(examples.length + 1);
    for (const v of videos) {
      expect(v.getAttribute("poster")).toMatch(/\.webp$/);
      expect(v.getAttribute("aria-label")).toBeTruthy();
      expect(v.muted).toBe(true);
      expect(v.getAttribute("preload")).toBe("none");
    }
    expect(screen.getAllByRole("button", { name: /^(Play|Pause): / })).toHaveLength(videos.length);
  });

  // jsdom never fetches preload="none" media and Lighthouse never plays it, so a missing film only shows up here.
  it("ships every film and poster it references", () => {
    const { container } = render(<Home />);
    const base = process.env.SITE_BASE_PATH ?? "";
    for (const v of container.querySelectorAll("video")) {
      for (const src of [v.getAttribute("src"), v.getAttribute("poster")]) {
        expect(src).toBeTruthy();
        const file = join(process.cwd(), "public", (src ?? "").slice(base.length));
        expect(existsSync(file), file).toBe(true);
      }
    }
  });

  it("lists the steps and the agent tools", () => {
    render(<Home />);
    const how = screen.getByRole("region", { name: "A brief in. A film out." });
    for (const s of steps) expect(within(how).getByText(s.title)).toBeInTheDocument();
    for (const a of agentApps) expect(screen.getByText(a)).toBeInTheDocument();
  });

  it("has no axe violations (contrast is Lighthouse's job: jsdom has no layout)", async () => {
    const { container } = render(<Home />);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
    ).toEqual([]);
  });
});
