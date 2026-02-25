"use client";

import { useState, useRef, useEffect } from "react";
import {
  Users,
  Building2,
  UserCheck,
  TrendingUp,
  Target,
  Lightbulb,
  MessageCircle,
  Search,
  ChevronDown,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { JsonDisplay } from "./json-display";

// ---------------------------------------------------------------------------
// Card config registry — add/remove entries as hydration fields evolve.
// Unknown keys gracefully fall back to a generic card with auto-formatted label.
// ---------------------------------------------------------------------------

interface CardConfig {
  icon: LucideIcon;
  label: string;
  iconBg: string;
  iconColor: string;
}

const CARD_REGISTRY: Record<string, CardConfig> = {
  contact_info: {
    icon: Users,
    label: "Contact Info",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  clinic_profile: {
    icon: Building2,
    label: "Clinic Profile",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  decision_maker: {
    icon: UserCheck,
    label: "Decision Maker",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  growth_signals: {
    icon: TrendingUp,
    label: "Growth Signals",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  competitive_intel: {
    icon: Target,
    label: "Competitive Intel",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
  },
  personalization_hooks: {
    icon: Lightbulb,
    label: "Personalization Hooks",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
  },
  suggested_openers: {
    icon: MessageCircle,
    label: "Suggested Openers",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-500",
  },
  searches_performed: {
    icon: Search,
    label: "Searches Performed",
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-500",
  },
};

const DEFAULT_ICON: LucideIcon = Layers;
const DEFAULT_ICON_BG = "bg-zinc-100";
const DEFAULT_ICON_COLOR = "text-zinc-500";

// Metadata scalars — compact inline footer instead of their own cards
const META_KEYS = new Set([
  "performed_at",
  "method",
  "quality_score",
  "disposition_recommendation",
]);

const COLLAPSED_MAX_HEIGHT = 180;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface HydrationDisplayProps {
  hydration: Record<string, unknown>;
}

export function HydrationDisplay({ hydration }: HydrationDisplayProps) {
  const entries = Object.entries(hydration);
  const cards = entries.filter(([k, v]) => !META_KEYS.has(k) && v != null);
  const meta = entries.filter(([k, v]) => META_KEYS.has(k) && v != null);

  if (cards.length === 0 && meta.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map(([key, value]) => {
          const config = CARD_REGISTRY[key];
          return (
            <HydrationCard
              key={key}
              icon={config?.icon ?? DEFAULT_ICON}
              label={config?.label ?? formatLabel(key)}
              iconBg={config?.iconBg ?? DEFAULT_ICON_BG}
              iconColor={config?.iconColor ?? DEFAULT_ICON_COLOR}
              data={value}
            />
          );
        })}
      </div>
      {meta.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-zinc-50 px-3 py-2 text-[11px] text-zinc-400">
          {meta.map(([key, value]) => (
            <span key={key}>
              {formatLabel(key)}:{" "}
              <span className="font-medium text-zinc-500">{String(value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual card — collapsed preview with gradient fade + expand
// ---------------------------------------------------------------------------

function HydrationCard({
  icon: Icon,
  label,
  iconBg,
  iconColor,
  data,
}: {
  icon: LucideIcon;
  label: string;
  iconBg: string;
  iconColor: string;
  data: unknown;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Detect if content overflows the collapsed max-height
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > COLLAPSED_MAX_HEIGHT);
    check();
    // Recheck if content resizes (e.g. images/fonts loading)
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  // Reset expand when underlying data changes (new contact selected)
  const dataRef = useRef(data);
  useEffect(() => {
    if (dataRef.current !== data) {
      dataRef.current = data;
      setExpanded(false);
    }
  }, [data]);

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <button
        onClick={() => overflows && setExpanded((e) => !e)}
        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-left ${
          overflows ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg p-1.5 ${iconBg}`}
        >
          <Icon size={14} className={iconColor} />
        </div>
        <h4 className="flex-1 text-xs font-semibold text-zinc-700 tracking-wide">
          {label}
        </h4>
        {overflows && (
          <ChevronDown
            size={14}
            className={`shrink-0 text-zinc-300 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Divider */}
      <div className="mx-3 border-t border-zinc-100" />

      {/* Content */}
      <div className="relative min-h-0">
        <div
          ref={contentRef}
          className={`px-3.5 py-3 text-sm transition-[max-height] duration-200 ease-in-out ${
            expanded ? "" : "overflow-hidden"
          }`}
          style={
            !expanded && overflows
              ? { maxHeight: `${COLLAPSED_MAX_HEIGHT}px` }
              : undefined
          }
        >
          <JsonDisplay data={data} />
        </div>

        {/* Gradient fade when collapsed + overflowing */}
        {overflows && !expanded && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent" />
        )}
      </div>

      {/* Expand / Collapse bar */}
      {overflows && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center justify-center gap-1 border-t border-zinc-100 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown
            size={11}
            className={`transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
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
