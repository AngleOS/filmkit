"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

// A command to paste, with a copy button that says it copied (to screen readers too).
export function CopyCommand({
  command,
  label,
  multiline = false,
}: {
  command: string;
  label: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="cmd group relative flex items-start gap-3 rounded-[8px] border border-line bg-night-2 py-2 pr-2 pl-4">
      {!multiline && (
        <span
          aria-hidden="true"
          className="select-none py-1.5 font-mono text-[13px] leading-6 text-pear sm:text-[14px]"
        >
          $
        </span>
      )}
      <code
        className={`min-w-0 flex-1 py-1.5 font-mono text-[13px] leading-6 text-ink [overflow-wrap:anywhere] sm:text-[14px] ${multiline ? "max-h-80 overflow-auto whitespace-pre-wrap" : "sm:overflow-x-auto sm:whitespace-nowrap"}`}
      >
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        className="grid size-9 shrink-0 place-items-center rounded-[4px] text-muted transition hover:bg-line hover:text-ink"
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="size-4 text-pear" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}
