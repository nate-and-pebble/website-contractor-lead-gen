"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Send,
  PhoneCall,
  Trash2,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  fetchContacts,
  patchContact,
  type ContactListItem,
} from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";
import { Skeleton } from "@/components/skeleton";
import { DateTimePicker } from "@/components/date-time-picker";

type Court = "mine" | "theirs" | "scheduled";

interface BookedContact extends ContactListItem {
  ball_in_court: string | null;
  ball_in_court_note: string | null;
  follow_up_at: string | null;
}

export default function PipelinePage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<BookedContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts({ status: ["booked"], limit: 200, sort_by: "updated_at", sort_dir: "desc" })
      .then((data) => setContacts(data.contacts as BookedContact[]))
      .catch(() => toast("Failed to load pipeline", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const updateContact = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      // Optimistic update
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c))
      );
      try {
        await patchContact(id, updates);
      } catch {
        toast("Update failed", "error");
        // Reload on failure
        fetchContacts({ status: ["booked"], limit: 200, sort_by: "updated_at", sort_dir: "desc" })
          .then((data) => setContacts(data.contacts as BookedContact[]))
          .catch(() => {});
      }
    },
    [toast]
  );

  const removeContact = useCallback(
    async (id: string, updates: Record<string, unknown>, message: string) => {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      try {
        await patchContact(id, updates);
        toast(message);
      } catch {
        toast("Update failed", "error");
        fetchContacts({ status: ["booked"], limit: 200, sort_by: "updated_at", sort_dir: "desc" })
          .then((data) => setContacts(data.contacts as BookedContact[]))
          .catch(() => {});
      }
    },
    [toast]
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-200 bg-white px-4 md:px-6 py-5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-1 h-4 w-56" />
        </div>
        <div className="flex flex-1 gap-4 p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const mine = contacts.filter((c) => c.ball_in_court === "mine");
  const theirs = contacts.filter((c) => c.ball_in_court === "theirs");
  const scheduled = contacts.filter((c) => c.ball_in_court === "scheduled");
  // Contacts without ball_in_court set go to "mine" by default
  const unassigned = contacts.filter((c) => !c.ball_in_court);
  const myTurn = [...mine, ...unassigned];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 bg-white px-4 md:px-6 py-5">
        <h1 className="text-2xl font-bold text-zinc-900">Pipeline</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {contacts.length} active deal{contacts.length !== 1 ? "s" : ""} in progress
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-16 text-center">
          <div className="rounded-full bg-emerald-50 p-4">
            <Handshake size={32} className="text-emerald-500" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-700">No active deals yet</p>
          <p className="mt-1 max-w-sm text-xs text-zinc-400">
            When you book meetings from the Call List or Campaign, they&apos;ll show up here
            so you can track whose turn it is.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto p-4 md:p-6 min-h-0">
          <PipelineColumn
            title="My Turn"
            subtitle="You need to take action"
            color="amber"
            contacts={myTurn}
            onUpdate={updateContact}
            onRemove={removeContact}
          />
          <PipelineColumn
            title="Their Turn"
            subtitle="Waiting on them"
            color="blue"
            contacts={theirs}
            onUpdate={updateContact}
            onRemove={removeContact}
          />
          <PipelineColumn
            title="Scheduled"
            subtitle="Meeting on the calendar"
            color="emerald"
            contacts={scheduled}
            onUpdate={updateContact}
            onRemove={removeContact}
          />
        </div>
      )}
    </div>
  );
}

function Handshake({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14h2" />
      <path d="m8 7-1.25 1.25a1 1 0 0 0 0 3L9 13.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Column                                                            */
/* ------------------------------------------------------------------ */

function PipelineColumn({
  title,
  subtitle,
  color,
  contacts,
  onUpdate,
  onRemove,
}: {
  title: string;
  subtitle: string;
  color: "amber" | "blue" | "emerald";
  contacts: BookedContact[];
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onRemove: (id: string, updates: Record<string, unknown>, message: string) => void;
}) {
  const colorMap = {
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  };
  const c = colorMap[color];

  return (
    <div className="flex min-w-[260px] md:min-w-[280px] flex-1 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        <span className={`rounded-full ${c.bg} px-2 py-0.5 text-xs font-medium ${c.text}`}>
          {contacts.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-zinc-400">{subtitle}</p>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className={`rounded-lg border border-dashed ${c.border} p-6 text-center`}>
            <p className="text-xs text-zinc-400">No contacts here</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <DealCard
              key={contact.id}
              contact={contact}
              columnColor={color}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deal Card                                                         */
/* ------------------------------------------------------------------ */

function DealCard({
  contact,
  columnColor,
  onUpdate,
  onRemove,
}: {
  contact: BookedContact;
  columnColor: "amber" | "blue" | "emerald";
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onRemove: (id: string, updates: Record<string, unknown>, message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(contact.ball_in_court_note ?? "");
  const [showSchedule, setShowSchedule] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showDeadConfirm, setShowDeadConfirm] = useState(false);
  const [deadNote, setDeadNote] = useState(contact.ball_in_court_note ?? "");
  const [acting, setActing] = useState(false);

  const followUp = contact.follow_up_at ? new Date(contact.follow_up_at) : null;
  const now = new Date();
  const isOverdue = followUp ? followUp < now : false;
  const court = contact.ball_in_court ?? "mine";

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const doAction = async (fn: () => Promise<void>) => {
    setActing(true);
    await fn();
    setActing(false);
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">
              {contact.first_name} {contact.last_name}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {[contact.title, contact.company].filter(Boolean).join(" at ")}
            </p>
          </div>
          {expanded ? (
            <ChevronUp size={14} className="mt-1 shrink-0 text-zinc-400" />
          ) : (
            <ChevronDown size={14} className="mt-1 shrink-0 text-zinc-400" />
          )}
        </div>

        {/* Note */}
        {contact.ball_in_court_note && !editingNote && (
          <p className="mt-1.5 text-xs text-zinc-600 italic">
            &ldquo;{contact.ball_in_court_note}&rdquo;
          </p>
        )}

        {/* Follow-up date / overdue indicator */}
        {followUp && (
          <div className={`mt-2 flex items-center gap-1 text-[11px] font-medium ${isOverdue ? "text-red-600" : "text-zinc-400"}`}>
            {isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
            {isOverdue ? `Overdue — was ${formatDate(followUp)}` : formatDate(followUp)}
          </div>
        )}
      </button>

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-zinc-100 px-4 py-3 space-y-3">
          {/* Edit note */}
          <div>
            {editingNote ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="What's the next step?"
                  className="flex-1 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 focus:border-zinc-300 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onUpdate(contact.id, { ball_in_court_note: noteValue || null });
                      setEditingNote(false);
                    }
                    if (e.key === "Escape") {
                      setNoteValue(contact.ball_in_court_note ?? "");
                      setEditingNote(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    onUpdate(contact.id, { ball_in_court_note: noteValue || null });
                    setEditingNote(false);
                  }}
                  className="rounded bg-zinc-800 px-2 py-1 text-[10px] font-medium text-white"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingNote(true)}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                {contact.ball_in_court_note ? "Edit note" : "+ Add note"}
              </button>
            )}
          </div>

          {/* Schedule date picker */}
          {showSchedule && (
            <DateTimePicker
              accent="emerald"
              confirmLabel="Schedule"
              onSelect={(iso) => {
                onUpdate(contact.id, {
                  ball_in_court: "scheduled",
                  follow_up_at: iso,
                });
                setShowSchedule(false);
              }}
              onCancel={() => setShowSchedule(false)}
            />
          )}

          {/* Dead confirmation */}
          {showDeadConfirm && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-xs font-medium text-red-700">
                Mark as dead? This removes them from the pipeline.
              </p>
              <input
                value={deadNote}
                onChange={(e) => setDeadNote(e.target.value)}
                placeholder="Final note (optional)..."
                className="w-full rounded border border-red-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-red-300 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => doAction(async () => {
                    onRemove(contact.id, {
                      status: "dead",
                      ball_in_court: null,
                      ball_in_court_note: null,
                      notes: deadNote || contact.ball_in_court_note || null,
                    }, "Contact marked as dead");
                  })}
                  disabled={acting}
                  className="rounded bg-red-600 px-3 py-1 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Yes, mark dead
                </button>
                <button
                  onClick={() => setShowDeadConfirm(false)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5">
            {court !== "mine" && (
              <MoveButton
                icon={<User size={12} />}
                label="My Turn"
                acting={acting}
                onClick={() => doAction(async () => {
                  onUpdate(contact.id, { ball_in_court: "mine", follow_up_at: null });
                })}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              />
            )}
            {court !== "theirs" && (
              <MoveButton
                icon={<ArrowRight size={12} />}
                label="Their Turn"
                acting={acting}
                onClick={() => {
                  const bounce = new Date();
                  bounce.setDate(bounce.getDate() + 3);
                  onUpdate(contact.id, {
                    ball_in_court: "theirs",
                    follow_up_at: bounce.toISOString(),
                  });
                }}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              />
            )}
            {court !== "scheduled" && (
              <MoveButton
                icon={<Calendar size={12} />}
                label="Schedule"
                acting={acting}
                onClick={() => setShowSchedule(true)}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              />
            )}

            <div className="relative ml-auto flex gap-1.5">
              {/* Move dropdown */}
              <div className="relative">
                <MoveButton
                  icon={<ArrowRight size={12} />}
                  label="Move..."
                  acting={acting}
                  onClick={() => setShowMoveMenu(!showMoveMenu)}
                  className="border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                />
                {showMoveMenu && (
                  <div className="absolute bottom-full right-0 mb-1 z-20 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={() => doAction(async () => {
                        onRemove(contact.id, { status: "ready", disposition: "call", ball_in_court: null, ball_in_court_note: null, follow_up_at: null }, "Moved back to call list");
                        setShowMoveMenu(false);
                      })}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      <PhoneCall size={12} className="text-blue-500" />
                      Back to Call List
                    </button>
                    <button
                      onClick={() => doAction(async () => {
                        onRemove(contact.id, { status: "ready", disposition: "campaign", ball_in_court: null, ball_in_court_note: null, follow_up_at: null }, "Moved to campaign");
                        setShowMoveMenu(false);
                      })}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      <Send size={12} className="text-green-500" />
                      Send to Campaign
                    </button>
                  </div>
                )}
              </div>

              {/* Dead button — opens confirmation */}
              <MoveButton
                icon={<Trash2 size={12} />}
                label="Dead"
                acting={acting}
                onClick={() => {
                  setDeadNote(contact.ball_in_court_note ?? "");
                  setShowDeadConfirm(!showDeadConfirm);
                }}
                className="border-red-200 text-red-500 hover:bg-red-50"
              />
            </div>
          </div>

          {/* Full profile link */}
          <Link
            href={`/contacts/${contact.id}`}
            className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600"
          >
            View full profile <ExternalLink size={10} />
          </Link>
        </div>
      )}
    </div>
  );
}

function MoveButton({
  icon,
  label,
  acting,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  acting: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={acting}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${className}`}
    >
      {acting ? <Loader2 size={12} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
