"use client";

import { Mail, Clock, AlertCircle } from "lucide-react";
import type { ContactListItem } from "@/lib/api-client";

interface CampaignQueueProps {
  contacts: ContactListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatFollowUp(dateStr: string | null): { label: string; overdue: boolean } | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return { label: absDays === 1 ? "1 day overdue" : `${absDays}d overdue`, overdue: true };
  }
  if (diffDays === 0) return { label: "Today", overdue: false };
  if (diffDays === 1) return { label: "Tomorrow", overdue: false };
  return {
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}

export function CampaignQueue({ contacts, selectedId, onSelect }: CampaignQueueProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex w-80 shrink-0 flex-col items-center justify-center border-r border-zinc-200 bg-white p-8 text-center">
        <div className="rounded-full bg-green-50 p-3">
          <Mail size={24} className="text-green-500" />
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-700">No emails queued</p>
        <p className="mt-1 text-xs text-zinc-400">
          Triage contacts from the dashboard to add them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex-1 overflow-y-auto">
        {contacts.map((c) => {
          const active = c.id === selectedId;
          const followUp = formatFollowUp(c.follow_up_at ?? null);

          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full border-b border-zinc-100 px-4 py-3 text-left transition-colors ${
                active
                  ? "border-l-2 border-l-green-500 bg-green-50/50"
                  : "hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {[c.title, c.company].filter(Boolean).join(" at ") || "\u2014"}
                  </p>
                </div>
                {followUp && (
                  <span
                    className={`mt-0.5 flex shrink-0 items-center gap-1 text-[10px] font-medium ${
                      followUp.overdue
                        ? "text-red-600"
                        : "text-zinc-400"
                    }`}
                  >
                    {followUp.overdue ? (
                      <AlertCircle size={10} />
                    ) : (
                      <Clock size={10} />
                    )}
                    {followUp.label}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
