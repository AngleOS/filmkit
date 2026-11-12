import { ArrowDown, ArrowRight } from "lucide-react";
import { Beat } from "@/components/beat";
import { CopyCommand } from "@/components/copy-command";
import { FilmStill } from "@/components/film-still";
import { FormatSwitcher } from "@/components/format-switcher";
import { InstallTabs } from "@/components/install-tabs";
import { Lockup } from "@/components/lockup";
import { Viewfinder } from "@/components/viewfinder";
import {
  agentApps,
  agentPrompt,
  asset,
  examples,
  installPaths,
  kit,
  REPO_URL,
  steps,
  tools,
} from "@/lib/content";

const NAV = [
  ["#examples", "Examples"],
  ["#how", "How it works"],
  ["#agents", "Agents"],
  ["#kit", "The kit"],
] as const;

export default function Home() {
  const prompt = agentPrompt();
  const landscape = examples.filter((e) => e.id !== "hook");
  const hook = examples.find((e) => e.id === "hook");
  return (
    <>
      <header className="site-header">
        <nav aria-label="Main" className="shell flex h-14 items-center gap-4 sm:h-16 sm:gap-6">
          <a
            href="#top"
            className="min-w-0 text-[16px] min-[380px]:text-[19px] sm:text-[22px]"
            aria-label="Angle Filmkit, home"
          >
            <Lockup />
          </a>
          <ul className="ml-auto hidden items-center gap-7 whitespace-nowrap text-[14px] text-muted lg:flex">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <a className="nav-link" href={href}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#install" className="btn-pear ml-auto shrink-0 lg:ml-0">
            Install
          </a>
        </nav>
      </header>

      <main id="main">
        <section id="top" aria-labelledby="hero-title" className="hero">
          <div className="shell grid grid-cols-1 gap-12 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-16 lg:pt-24 lg:pb-28">
            <div className="min-w-0">
              <p className="kicker mb-5 sm:mb-6">
                <span aria-hidden="true" className="tick" />A brief in · every format out
              </p>
              <h1
                id="hero-title"
                className="display text-[clamp(2.75rem,11.5vw,6.6rem)] lg:text-[clamp(4.5rem,7vw,6.6rem)]"
              >
                Your agent makes the <span className="text-pear">film.</span>
              </h1>
              <p className="lead mt-6 sm:mt-7">
                Write a brief. Your agent builds the film from scenes with taste, checks every
                format, looks at its own frames and renders it, with sound and captions. You review
                it like code.
              </p>
              <div className="mt-8 flex max-w-[34rem] flex-col gap-4 sm:mt-9">
                <CopyCommand
                  command="npx -y github:AngleOS/filmkit setup"
                  label="install command"
                />
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px]">
                  <a href="#install" className="link-arrow">
                    Or paste one prompt into your agent
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </a>
                  <a href={REPO_URL} className="link-arrow text-muted">
                    GitHub
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
            <div className="rise min-w-0 lg:pt-12">
              <FormatSwitcher />
            </div>
          </div>
        </section>

        <Beat
          id="examples"
          n="01"
          tc="00:00:08:00"
          kicker="Examples"
          title={
            <>
              Made with the kit. <span className="text-pear">Every frame.</span>
            </>
          }
        >
          <Viewfinder label="Teaser · 16:9 · 7 s" className="mb-14 sm:mb-16">
            <FilmStill
              src={asset("/media/teaser.webp")}
              ratio="16 / 9"
              label="Still from Angle Filmkit's teaser: the Angle Filmkit lockup, 'Your agent makes the film.', and four format frames, 16:9, 1:1, 4:5 and 9:16, over the brand lines."
            />
          </Viewfinder>
          <div className="examples-grid">
            <ul className="examples-landscape">
              {landscape.map((e) => (
                <li key={e.id} className="min-w-0">
                  <ExampleFilm {...e} />
                </li>
              ))}
              <li className="min-w-0">
                <a href="#install" className="your-film group">
                  <span className="display text-[clamp(1.6rem,6vw,2.1rem)] text-ink">
                    Your film <span className="text-pear">here.</span>
                  </span>
                  <span className="inline-flex items-center justify-center gap-2 text-[15px] text-muted transition-colors group-hover:text-pear">
                    Paste one prompt into your agent
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </a>
              </li>
            </ul>
            {hook && (
              <div className="examples-vertical">
                <ExampleFilm {...hook} />
              </div>
            )}
          </div>
          <p className="footnote mt-12">Example data. Each film is a few dozen lines of HTML.</p>
        </Beat>

        <Beat
          id="how"
          n="02"
          tc="00:00:20:00"
          kicker="How it works"
          title={
            <>
              A brief in. <span className="text-pear">A film out.</span>
            </>
          }
          className="bg-night-2"
        >
          <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-[8px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-3 bg-night-2 p-6 sm:p-7">
                <span className="flex items-center justify-between font-mono text-[12px] tracking-[0.14em] text-muted">
                  <span className="text-pear">{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden="true" className="tabular-nums">
                    {s.tc}
                  </span>
                </span>
                <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-ink sm:text-[22px]">
                  {s.title}
                </h3>
                <p className="body-sm">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="body mt-8 max-w-[48rem]">
            It's the workflow that made Angle's launch film, eight feature clips and three vertical
            hooks, written down as a skill your agent follows:{" "}
            <code className="font-mono text-[0.92em] text-ink">skills/filmkit/SKILL.md</code>.
          </p>
        </Beat>

        <Beat
          id="agents"
          n="03"
          tc="00:00:32:00"
          kicker="Built for agents"
          title={
            <>
              Your agent drives. <span className="text-pear">It sees its own frames.</span>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
            <div className="min-w-0">
              <p className="body mb-7 max-w-[38rem]">
                Filmkit is an MCP server, a CLI and a skill. Snapshots and contact sheets come back
                as images, so the model looks at what it made, catches the caption that collides in
                9:16, and fixes it before you see it.
              </p>
              <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[8px] border border-line bg-line min-[480px]:grid-cols-2">
                {tools.map(([name, what]) => (
                  <div key={name} className="flex flex-col gap-1 bg-night px-5 py-4">
                    <dt className="font-mono text-[14px] text-pear">{name}</dt>
                    <dd className="text-[15px] text-muted">{what}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="min-w-0">
              <h3 className="kicker mb-5">Set up for you in</h3>
              <ul className="flex flex-wrap gap-2">
                {agentApps.map((a) => (
                  <li key={a} className="chip">
                    {a}
                  </li>
                ))}
              </ul>
              <p className="body-sm mt-6">
                <code className="font-mono text-ink">filmkit setup</code> finds the agent tools on
                your machine and registers the server and skill in each, keeping a backup of every
                config. Undo it with <code className="font-mono text-ink">--remove</code>.
              </p>
            </div>
          </div>
        </Beat>

        <Beat
          id="kit"
          n="04"
          tc="00:00:40:00"
          kicker="The kit"
          title={
            <>
              Taste, <span className="text-pear">built in.</span>
            </>
          }
          className="bg-night-2"
        >
          <ul className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-3">
            {kit.map((k) => (
              <li key={k.title} className="kit-item">
                <h3 className="mb-2.5 text-[19px] font-semibold tracking-[-0.02em] text-ink sm:text-[20px]">
                  {k.title}
                </h3>
                <p className="body-sm">{k.body}</p>
              </li>
            ))}
          </ul>
        </Beat>

        <Beat
          id="install"
          n="05"
          tc="00:00:48:00"
          kicker="Install"
          title={
            <>
              One line. <span className="text-pear">Or one prompt.</span>
            </>
          }
        >
          <InstallTabs paths={installPaths(prompt)} />
          <p className="body-sm mt-10">
            Needs Node 20+ and ffmpeg, and the installer handles both. Questions and source on{" "}
            <a className="text-link" href={REPO_URL}>
              GitHub
            </a>
            .
          </p>
        </Beat>
      </main>

      <footer className="border-t border-line">
        <div className="shell flex flex-col gap-10 py-16 sm:py-20">
          <p className="kicker">
            <span className="text-pear">06</span>
            <span aria-hidden="true" className="h-px w-8 bg-line" />
            <span>End card</span>
            <span aria-hidden="true" className="ml-auto hidden tabular-nums sm:inline">
              00:00:56:00
            </span>
          </p>
          <p className="display max-w-[14ch] text-[clamp(2.4rem,9vw,4.6rem)]">
            Brief in. <span className="text-pear">Film out.</span>
          </p>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3">
              <span className="text-[20px] min-[380px]:text-[24px] sm:text-[26px]">
                <Lockup />
              </span>
              <span className="text-[14px] text-muted">
                Made by Angle: private AI on open models.
              </span>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-[14px] text-muted">
              <li>
                <a className="nav-link" href={REPO_URL}>
                  GitHub
                </a>
              </li>
              <li>
                <a className="nav-link" href={`${REPO_URL}/blob/master/LICENSE`}>
                  MIT licence
                </a>
              </li>
            </ul>
          </div>
          <p className="border-t border-line pt-6 text-[13px] leading-relaxed text-muted">
            © 2026 Angle. Angle and the Angle logo are trademarks of Angle. Filmkit's code is
            MIT-licensed.
          </p>
        </div>
      </footer>
    </>
  );
}

function ExampleFilm({
  id,
  title,
  note,
  label,
  ratio,
}: {
  id: string;
  title: string;
  note: string;
  label: string;
  ratio: string;
}) {
  return (
    <figure className="flex flex-col gap-4">
      <Viewfinder>
        <FilmStill src={asset(`/media/${id}.webp`)} ratio={ratio} label={label} />
      </Viewfinder>
      <figcaption className="text-[15px] leading-relaxed">
        <span className="font-semibold text-ink">{title}</span>
        <span className="text-muted"> · {note}</span>
      </figcaption>
    </figure>
  );
}
