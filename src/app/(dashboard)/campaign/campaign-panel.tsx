"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  ExternalLink,
  Send,
  MailCheck,
  Copy,
  Check,
  PhoneCall,
  Trophy,
  ThumbsDown,
  Loader2,
  Clock,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Globe,
  Mic,
  Video,
  FileText,
  Linkedin,
  Instagram,
} from "lucide-react";
import { type ContactDetail } from "@/lib/api-client";
import type { CallLog } from "@/lib/types";
import { Skeleton } from "@/components/skeleton";
import { JsonDisplay } from "@/components/json-display";

const typeIcons: Record<string, typeof BookOpen> = {
  blog: BookOpen,
  podcast: Mic,
  video: Video,
  article: FileText,
  website: Globe,
};
import { DateTimePicker } from "@/components/date-time-picker";
import type { EmailOutcome } from "./page";

interface CampaignPanelProps {
  contact: ContactDetail | null;
  loading: boolean;
  activityLogs: CallLog[];
  onAction: (outcome: EmailOutcome, opts?: { notes?: string; followUpAt?: string }) => void;
  onBack?: () => void;
}

const OUTCOME_LABELS: Record<string, string> = {
  emailed: "Emailed",
  follow_up_email: "Follow-up sent",
  moved_to_calls: "Moved to calls",
  booked_meeting: "Booked meeting",
  not_interested: "Not interested",
  // Call outcomes might appear in history too
  no_answer: "No answer",
  voicemail: "Left voicemail",
  follow_up: "Scheduled follow-up",
  moved_to_campaign: "Moved to campaign",
};

function formatLogDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildEmailSnippet(contact: ContactDetail): string {
  const research = contact.research;
  const researchData = (research?.research_data ?? {}) as Record<string, unknown>;
  const hooks = Array.isArray(researchData.personal_hooks)
    ? (researchData.personal_hooks as string[])
    : [];

  const name = contact.first_name;
  const company = contact.company || "your organization";

  let snippet = `Hi ${name},\n\n`;

  if (hooks.length > 0) {
    snippet += `I noticed ${hooks[0].toLowerCase()}. `;
  }

  if (research?.summary) {
    const firstSentence = research.summary.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 10) {
      snippet += `Given your work at ${company}, `;
    }
  }

  snippet += `I'd love to connect about how we might be able to help.\n\n`;
  snippet += `Would you have 15 minutes this week for a quick call?\n\n`;
  snippet += `Best,\nRebecca`;

  return snippet;
}

export function CampaignPanel({ contact, loading, activityLogs, onAction, onBack }: CampaignPanelProps) {
  const [acting, setActing] = useState<string | null>(null);
  const [showBookingDate, setShowBookingDate] = useState(false);
  const [showMoveBoard, setShowMoveBoard] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const moveBoardRef = useRef<HTMLDivElement>(null);

  // Close move board dropdown on outside click
  useEffect(() => {
    if (!showMoveBoard) return;
    function handleClick(e: MouseEvent) {
      if (moveBoardRef.current && !moveBoardRef.current.contains(e.target as Node)) {
        setShowMoveBoard(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMoveBoard]);

  // Reset copied state
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleAction = async (outcome: EmailOutcome, opts?: { notes?: string; followUpAt?: string }) => {
    if (acting) return;
    setActing(outcome);
    await onAction(outcome, opts);
    setActing(null);
    setShowBookingDate(false);
    setActionNotes("");
  };

  const handleCopySnippet = async () => {
    if (!contact) return;
    const snippet = buildEmailSnippet(contact);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = snippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
        Select a contact to start emailing
      </div>
    );
  }

  const research = contact.research;
  const researchData = (research?.research_data ?? {}) as Record<string, unknown>;
  const hooks = Array.isArray(researchData.personal_hooks)
    ? (researchData.personal_hooks as string[])
    : [];

  // Extract LinkedIn + Instagram URLs from research data (hydration format)
  const hydration = researchData.hydration as Record<string, unknown> | undefined;
  const contactInfoData = hydration?.contact_info as Record<string, unknown> | undefined;
  const linkedinObj = contactInfoData?.linkedin as Record<string, unknown> | undefined;
  const linkedinUrl = typeof linkedinObj?.value === "string" ? linkedinObj.value : null;
  const instagramObj = contactInfoData?.instagram as Record<string, unknown> | undefined;
  const instagramUrl = typeof instagramObj?.value === "string" ? instagramObj.value : null;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        {/* Mobile back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 md:hidden"
          >
            <ArrowLeft size={16} />
            Back to list
          </button>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">
              {contact.first_name} {contact.last_name}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {[contact.title, contact.company].filter(Boolean).join(" at ")}
            </p>
          </div>
          <Link
            href={`/contacts/${contact.id}`}
            className="flex shrink-0 items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
          >
            Full profile <ExternalLink size={12} />
          </Link>
        </div>

        {/* Contact info */}
        <div className="flex flex-wrap gap-2 md:gap-4">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              <Mail size={16} />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              <Phone size={16} />
              {contact.phone}
            </a>
          )}
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100"
            >
              <Linkedin size={16} />
              LinkedIn
            </a>
          )}
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-medium text-pink-700 transition-colors hover:bg-pink-100"
            >
              <Instagram size={16} />
              Instagram
            </a>
          )}
        </div>

        {/* Email Snippet — copy to clipboard */}
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-600">
              Email Snippet
            </h3>
            <button
              onClick={handleCopySnippet}
              className="flex items-center gap-1.5 rounded-md bg-white border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              {copied ? (
                <>
                  <Check size={12} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-green-900 font-sans">
            {buildEmailSnippet(contact)}
          </pre>
        </div>

        {/* Research Summary */}
        {research?.summary ? (
          <div className="rounded-lg border-l-4 border-green-400 bg-green-50 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-600">
              Research Notes
            </h3>
            <p className="text-sm leading-relaxed text-green-900">
              {research.summary}
            </p>
          </div>
        ) : null}

        {/* Hooks — personalization angles */}
        {hooks.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Personalization Angles
            </h3>
            <div className="flex flex-wrap gap-2">
              {hooks.map((hook, i) => (
                <span
                  key={i}
                  className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                >
                  {hook}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Notes input */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Notes
          </h3>
          <textarea
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder="Add notes about this outreach..."
            rows={2}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
          />
        </div>

        {/* Activity History */}
        {activityLogs.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Activity History
            </h3>
            <div className="space-y-2">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <Clock size={14} className="mt-0.5 shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-700">
                        {OUTCOME_LABELS[log.outcome] ?? log.outcome}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatLogDate(log.created_at)}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="mt-0.5 text-xs text-zinc-500">{log.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ---- Research Details (grouped near bottom) ---- */}

        {/* Professional Background */}
        {researchData.professional_background != null ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Background
            </h3>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 text-sm">
              <JsonDisplay data={researchData.professional_background} />
            </div>
          </div>
        ) : null}

        {/* Content & Appearances */}
        {Array.isArray(researchData.content_appearances) &&
        researchData.content_appearances.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Content & Appearances
            </h3>
            <div className="space-y-2">
              {(researchData.content_appearances as Array<Record<string, unknown>>).map(
                (item, i) => {
                  const IconComponent =
                    typeIcons[String(item.type ?? "")] ?? FileText;
                  return (
                    <div
                      key={i}
                      className="flex gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2.5"
                    >
                      <IconComponent
                        size={16}
                        className="mt-0.5 shrink-0 text-zinc-400"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {item.source_url ? (
                            <a
                              href={String(item.source_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:underline"
                            >
                              {String(item.title ?? "Untitled")}
                              <ExternalLink
                                size={11}
                                className="ml-1 inline-block"
                              />
                            </a>
                          ) : (
                            <span className="text-sm font-medium text-zinc-800">
                              {String(item.title ?? "Untitled")}
                            </span>
                          )}
                        </div>
                        {item.date != null ? (
                          <p className="text-xs text-zinc-400">
                            {String(item.date)}
                          </p>
                        ) : null}
                        {item.key_takeaway != null ? (
                          <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                            {String(item.key_takeaway)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        ) : null}

        {/* Contact Info Found */}
        {researchData.contact_info_found != null ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Contact Info Found
            </h3>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 text-sm">
              <JsonDisplay data={researchData.contact_info_found} />
            </div>
          </div>
        ) : null}

        {/* Additional Research Data */}
        {(() => {
          const known = new Set([
            "professional_background",
            "content_appearances",
            "contact_info_found",
            "personal_hooks",
          ]);
          const extra = Object.fromEntries(
            Object.entries(researchData).filter(([k]) => !known.has(k))
          );
          if (Object.keys(extra).length === 0) return null;
          return (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Additional Research
              </h3>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 text-sm">
                <JsonDisplay data={extra} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Book meeting date picker */}
      {showBookingDate && (
        <div className="border-t border-zinc-100 bg-emerald-50/50 px-6 py-3">
          <DateTimePicker
            accent="emerald"
            confirmLabel="Book It!"
            onSelect={(iso) => {
              handleAction("booked_meeting", {
                notes: actionNotes || undefined,
                followUpAt: iso,
              });
            }}
            onCancel={() => setShowBookingDate(false)}
          />
        </div>
      )}

      {/* Action bar */}
      <div className="border-t border-zinc-200 bg-white px-4 md:px-6 py-3 space-y-2">
        {/* Email action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={<Send size={14} />}
            label="Emailed"
            acting={acting}
            outcome="emailed"
            onClick={() => handleAction("emailed", { notes: actionNotes || undefined })}
            className="border-green-200 bg-white text-green-700 hover:bg-green-50"
          />
          <ActionButton
            icon={<MailCheck size={14} />}
            label="Follow-up Sent"
            acting={acting}
            outcome="follow_up_email"
            onClick={() => handleAction("follow_up_email", { notes: actionNotes || undefined })}
            className="border-green-200 bg-white text-green-700 hover:bg-green-50"
          />
        </div>

        {/* Move board dropdown */}
        <div className="relative" ref={moveBoardRef}>
          <button
            onClick={() => setShowMoveBoard(!showMoveBoard)}
            disabled={!!acting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
          >
            <ArrowRight size={14} />
            Move Board
          </button>
          {showMoveBoard && (
            <div className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setShowMoveBoard(false);
                  setShowBookingDate(!showBookingDate);
                }}
                disabled={!!acting}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                <Trophy size={16} className="text-emerald-600" />
                <div>
                  <p className="font-medium">Booked Meeting!</p>
                  <p className="text-[10px] text-zinc-400">Schedule and move to pipeline</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowMoveBoard(false);
                  handleAction("moved_to_calls", { notes: actionNotes || undefined });
                }}
                disabled={!!acting}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <PhoneCall size={16} className="text-blue-600" />
                <div>
                  <p className="font-medium">Move to Call List</p>
                  <p className="text-[10px] text-zinc-400">Switch to phone outreach</p>
                </div>
              </button>
              <div className="mx-3 my-1 border-t border-zinc-100" />
              <button
                onClick={() => {
                  setShowMoveBoard(false);
                  handleAction("not_interested", { notes: actionNotes || undefined });
                }}
                disabled={!!acting}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <ThumbsDown size={16} />
                <div>
                  <p className="font-medium">Not Interested</p>
                  <p className="text-[10px] text-zinc-400">Mark as dead, remove from list</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  acting,
  outcome,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  acting: string | null;
  outcome: string;
  onClick: () => void;
  className: string;
}) {
  const isActing = acting === outcome;
  return (
    <button
      onClick={onClick}
      disabled={!!acting}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${className}`}
    >
      {isActing ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
