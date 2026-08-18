"use client";

import type { ModelMode } from "@/lib/types";

const OPTIONS: { mode: ModelMode; label: string; hint: string }[] = [
  { mode: "fast", label: "Fast", hint: "GPT-4o" },
  { mode: "robust", label: "Robust", hint: "Claude Sonnet 5" },
];

export function ModelToggle({
  value,
  onChange,
}: {
  value: ModelMode;
  onChange: (mode: ModelMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-surface-muted p-1 text-xs font-medium">
      {OPTIONS.map((opt) => {
        const active = opt.mode === value;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onChange(opt.mode)}
            title={opt.hint}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors cursor-pointer ${
              active
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {opt.label}
            <span className={`text-[10px] font-normal ${active ? "opacity-80" : "opacity-50"}`}>
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
