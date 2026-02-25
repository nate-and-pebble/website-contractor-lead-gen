"use client";

import type { ContactListItem } from "@/lib/api-client";
import { Inbox, Mail, Phone, Linkedin, Instagram } from "lucide-react";

interface QueueListProps {
  contacts: ContactListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function QueueList({ contacts, selectedId, onSelect }: QueueListProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex w-full md:w-80 shrink-0 flex-col items-center justify-center border-r border-zinc-200 bg-white p-8 text-center">
        <div className="rounded-full bg-green-50 p-3">
          <Inbox size={24} className="text-green-500" />
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-700">All caught up!</p>
        <p className="mt-1 text-xs text-zinc-400">
          No contacts need your review right now.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full md:w-80 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">
          Review Queue{" "}
          <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {contacts.length}
          </span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {contacts.map((c) => {
          const active = c.id === selectedId;
          const summary = c.contact_research[0]?.summary;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full border-b border-zinc-100 px-4 py-3 text-left transition-colors ${
                active
                  ? "border-l-2 border-l-indigo-500 bg-indigo-50/50"
                  : "hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {c.first_name} {c.last_name}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Mail size={12} className={c.email ? "text-blue-500" : "text-zinc-200"} />
                  <Phone size={12} className={c.phone ? "text-green-500" : "text-zinc-200"} />
                  <Linkedin size={12} className={c.linkedin_url ? "text-[#0A66C2]" : "text-zinc-200"} />
                  <Instagram size={12} className={c.instagram_url ? "text-[#E1306C]" : "text-zinc-200"} />
                </div>
              </div>
              <p className="truncate text-xs text-zinc-500">
                {[c.title, c.company].filter(Boolean).join(" at ") || "\u2014"}
              </p>
              {summary ? (
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                  {summary}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
