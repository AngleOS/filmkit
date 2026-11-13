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
    expect(screen.getAllByText("npx -y filmkit setup").length).toBeGreaterThan(0);
    for (const tab of ["Your agent", "npx", "macOS & Linux", "Windows"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  it("plays every film as a described loop over its poster, and ships both", () => {
    const { container } = render(<Home />);
    const base = process.env.SITE_BASE_PATH ?? "";
    const shipped = (path: string) => join(process.cwd(), "public", path.slice(base.length));
    const films = [...container.querySelectorAll("video")];
    expect(films).toHaveLength(examples.length + 1);
    for (const film of films) {
      expect(film.getAttribute("aria-label")).toBeTruthy();
      expect(film.muted).toBe(true);
      expect(film.getAttribute("preload")).toBe("none");
      const poster = film.getAttribute("poster") ?? "";
      const loop = film.getAttribute("src") ?? "";
      expect(poster).toMatch(/\.webp$/);
      // a root .gitignore rule once kept every .mp4 out of the deploy
      expect(loop).toMatch(/\.mp4$/);
      for (const file of [shipped(poster), shipped(loop)])
        expect(existsSync(file), file).toBe(true);
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
    // axe over the whole page takes about 5 s in jsdom on a busy runner, right at vitest's default timeout.
  }, 20_000);
});
