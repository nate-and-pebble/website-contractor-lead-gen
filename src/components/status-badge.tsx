"use client";

import { useState, useRef, useEffect } from "react";

interface StatusBadgeProps {
  status: string;
  type?: "contact" | "raw-lead";
  editable?: boolean;
  onChange?: (newStatus: string) => void;
}

const contactStatuses = ["new", "researched", "ready", "booked", "dead"];
const rawLeadStatuses = ["pending", "qualified", "rejected"];

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  researched: "bg-indigo-100 text-indigo-700 border-indigo-200",
  ready: "bg-green-100 text-green-700 border-green-200",
  booked: "bg-emerald-100 text-emerald-700 border-emerald-200",
  dead: "bg-zinc-100 text-zinc-500 border-zinc-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  qualified: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const dotColors: Record<string, string> = {
  new: "bg-blue-500",
  researched: "bg-indigo-500",
  ready: "bg-green-500",
  booked: "bg-emerald-500",
  dead: "bg-zinc-400",
  pending: "bg-amber-500",
  qualified: "bg-green-500",
  rejected: "bg-red-500",
};

export function StatusBadge({ status, type = "contact", editable = false, onChange }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const statuses = type === "contact" ? contactStatuses : rawLeadStatuses;
  const colorClass = statusColors[status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200";

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass} ${
          editable ? "cursor-pointer hover:ring-2 hover:ring-zinc-300" : ""
        }`}
      >
        {status}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[130px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg animate-fade-in">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(s);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm capitalize hover:bg-zinc-50 ${
                s === status ? "font-medium text-zinc-900" : "text-zinc-600"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dotColors[s] ?? "bg-zinc-300"}`} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
