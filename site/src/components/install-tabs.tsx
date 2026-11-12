"use client";

import { Tabs } from "radix-ui";
import { CopyCommand } from "./copy-command";

export type InstallPath = {
  id: string;
  tab: string;
  command: string;
  notes: string[];
  multiline?: boolean;
};

// The ways in, as tabs: your agent first (it does everything), then one line per OS, then npx.
export function InstallTabs({ paths }: { paths: InstallPath[] }) {
  return (
    <Tabs.Root defaultValue={paths[0]?.id} className="flex flex-col gap-6">
      <Tabs.List aria-label="How to install" className="tab-list">
        {paths.map((p) => (
          <Tabs.Trigger key={p.id} value={p.id} className="tab-trigger">
            {p.tab}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {paths.map((p) => (
        <Tabs.Content key={p.id} value={p.id} className="flex flex-col gap-4">
          <CopyCommand command={p.command} label={`${p.tab} command`} multiline={p.multiline} />
          <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-[15px] leading-relaxed text-muted sm:grid-cols-2">
            {p.notes.map((n) => (
              <li key={n} className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.7em] h-px w-3 shrink-0 bg-pear" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
