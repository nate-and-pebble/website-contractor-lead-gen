"use client";

import { JsonDisplay } from "./json-display";

const LABELS: Record<string, string> = {
  contact_info: "Contact Info",
  clinic_profile: "Clinic Profile",
  decision_maker: "Decision Maker",
  growth_signals: "Growth Signals",
  competitive_intel: "Competitive Intel",
  personalization_hooks: "Personalization Hooks",
  suggested_openers: "Suggested Openers",
  searches_performed: "Searches Performed",
};

// Small scalar metadata — shown as an inline footer, not their own cards
const META_KEYS = new Set([
  "performed_at",
  "method",
  "quality_score",
  "disposition_recommendation",
]);

interface HydrationDisplayProps {
  hydration: Record<string, unknown>;
}

export function HydrationDisplay({ hydration }: HydrationDisplayProps) {
  const entries = Object.entries(hydration);
  const cards = entries.filter(
    ([k, v]) => !META_KEYS.has(k) && v != null
  );
  const meta = entries.filter(
    ([k, v]) => META_KEYS.has(k) && v != null
  );

  if (cards.length === 0 && meta.length === 0) return null;

  return (
    <div className="space-y-2">
      {cards.map(([key, value]) => {
        const label = LABELS[key] || formatLabel(key);
        return (
          <details
            key={key}
            open
            className="group rounded-lg border border-zinc-100 bg-zinc-50/50"
          >
            <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 select-none hover:bg-zinc-100/50 transition-colors [&::-webkit-details-marker]:hidden">
              {label}
              <span className="text-[10px] text-zinc-300 transition-transform group-open:rotate-90">
                &#9656;
              </span>
            </summary>
            <div className="border-t border-zinc-100 px-3 py-2.5 text-sm">
              <JsonDisplay data={value} />
            </div>
          </details>
        );
      })}
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-1 text-[11px] text-zinc-400">
          {meta.map(([key, value]) => (
            <span key={key}>
              {LABELS[key] || formatLabel(key)}:{" "}
              <span className="text-zinc-500">{String(value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
