"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  ExternalLink,
  Send,
  PhoneCall,
  Trash2,
  Loader2,
  ArrowLeft,
  BookOpen,
  Globe,
  Mic,
  Video,
  FileText,
  Linkedin,
  Instagram,
} from "lucide-react";
import { type ContactDetail, patchContact } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";
import { JsonDisplay } from "@/components/json-display";
import { Skeleton } from "@/components/skeleton";

const typeIcons: Record<string, typeof BookOpen> = {
  blog: BookOpen,
  podcast: Mic,
  video: Video,
  article: FileText,
  website: Globe,
};

interface ContactPanelProps {
  contact: ContactDetail | null;
  loading: boolean;
  onAction: (action: "campaign" | "call" | "reject") => void;
  onContactUpdate: (contactId: string, updates: Record<string, unknown>) => void;
  onBack?: () => void;
}

export function ContactPanel({ contact, loading, onAction, onContactUpdate, onBack }: ContactPanelProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const contactId = contact?.id;
  const contactNotes = contact?.notes;

  useEffect(() => {
    setNotes(contactNotes ?? "");
  }, [contactId, contactNotes]);

  const saveField = async (field: string, value: string) => {
    if (!contact) return;
    const id = contact.id;
    const val = value || null;
    const oldVal = (contact as unknown as Record<string, unknown>)[field];
    onContactUpdate(id, { [field]: val });
    try {
      await patchContact(id, { [field]: val });
    } catch {
      onContactUpdate(id, { [field]: oldVal });
      toast("Failed to save", "error");
    }
  };

  const saveNotes = async () => {
    if (!contact || notes === (contact.notes ?? "")) return;
    try {
      await patchContact(contact.id, { notes });
    } catch {
      toast("Failed to save notes", "error");
    }
  };

  const handleAction = async (action: "campaign" | "call" | "reject") => {
    if (acting) return;
    setActing(action);
    if (contact && notes !== (contact.notes ?? "")) {
      await patchContact(contact.id, { notes }).catch(() => {});
    }
    await onAction(action);
    setActing(null);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
        Select a contact from the queue to review
      </div>
    );
  }

  const research = contact.research;
  const researchData = (research?.research_data ?? {}) as Record<string, unknown>;
  const hooks = Array.isArray(researchData.personal_hooks)
    ? (researchData.personal_hooks as string[])
    : [];

  // Extract LinkedIn URL from research data (hydration format)
  const hydration = researchData.hydration as Record<string, unknown> | undefined;
  const contactInfo = hydration?.contact_info as Record<string, unknown> | undefined;
  const linkedinObj = contactInfo?.linkedin as Record<string, unknown> | undefined;
  const linkedinUrl = typeof linkedinObj?.value === "string" ? linkedinObj.value : null;
  const instagramObj = contactInfo?.instagram as Record<string, unknown> | undefined;
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
            Back to queue
          </button>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-0.5">
              <EditableText value={contact.first_name} field="first_name" onSave={saveField} className="text-xl font-bold text-zinc-900" placeholder="First name" />
              <EditableText value={contact.last_name} field="last_name" onSave={saveField} className="text-xl font-bold text-zinc-900" placeholder="Last name" />
            </div>
            <div className="mt-0.5 flex items-center gap-0.5">
              <EditableText value={contact.title ?? ""} field="title" onSave={saveField} className="text-sm text-zinc-500" placeholder="Title" />
              <span className="px-0.5 text-sm text-zinc-300">at</span>
              <EditableText value={contact.company ?? ""} field="company" onSave={saveField} className="text-sm text-zinc-500" placeholder="Company" />
            </div>
          </div>
          <Link
            href={`/contacts/${contact.id}`}
            className="flex shrink-0 items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
          >
            Full profile <ExternalLink size={12} />
          </Link>
        </div>

        {/* Contact Info — right under header */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoField icon={<Mail size={14} />} label="Email" value={contact.email ?? ""} field="email" onSave={saveField} />
            <InfoField icon={<Phone size={14} />} label="Phone" value={contact.phone ?? ""} field="phone" onSave={saveField} />
            {linkedinUrl ? (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400"><Linkedin size={14} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase text-zinc-400">LinkedIn</p>
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline truncate"
                  >
                    Profile <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400"><Linkedin size={14} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase text-zinc-400">LinkedIn</p>
                  <span className="text-sm italic text-zinc-300">{"\u2014"}</span>
                </div>
              </div>
            )}
            {instagramUrl ? (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400"><Instagram size={14} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase text-zinc-400">Instagram</p>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-pink-600 hover:underline truncate"
                  >
                    Profile <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400"><Instagram size={14} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase text-zinc-400">Instagram</p>
                  <span className="text-sm italic text-zinc-300">{"\u2014"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Research Summary */}
        {research?.summary ? (
          <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4">
            <p className="text-sm leading-relaxed text-blue-900">
              {research.summary}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center">
            <p className="text-xs text-zinc-400">No research summary available</p>
          </div>
        )}

        {/* Personal Hooks */}
        {hooks.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Hooks
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

        {/* Notes */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes before taking action..."
            rows={3}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
          />
        </div>

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

      {/* Action bar — sticky bottom */}
      <div className="flex items-center gap-2 md:gap-3 border-t border-zinc-200 bg-white px-4 md:px-6 py-4">
        <button
          onClick={() => handleAction("campaign")}
          disabled={!!acting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {acting === "campaign" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          <span className="hidden sm:inline">Enroll in </span>Campaign
        </button>
        <button
          onClick={() => handleAction("call")}
          disabled={!!acting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {acting === "call" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <PhoneCall size={16} />
          )}
          <span className="hidden sm:inline">Queue for </span>Call
        </button>
        <button
          onClick={() => handleAction("reject")}
          disabled={!!acting}
          className="flex items-center justify-center rounded-lg border border-zinc-200 p-2.5 text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          title="Reject contact"
        >
          {acting === "reject" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline editable text — double-click to edit, Enter/blur to save   */
/* ------------------------------------------------------------------ */

function EditableText({
  value,
  field,
  onSave,
  className = "",
  placeholder = "\u2014",
}: {
  value: string;
  field: string;
  onSave: (field: string, value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelRef = useRef(false);

  // Keep draft in sync when value changes externally
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) {
      onSave(field, draft.trim());
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          if (cancelRef.current) {
            cancelRef.current = false;
            return;
          }
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            cancelRef.current = true;
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`w-full rounded border border-indigo-300 bg-white px-1.5 py-0.5 outline-none ${className}`}
      />
    );
  }

  return (
    <span
      onDoubleClick={startEdit}
      className={`inline-block cursor-default rounded px-1.5 py-0.5 transition-colors hover:bg-zinc-100 ${className}`}
      title="Double-click to edit"
    >
      {value ? value : <span className="italic text-zinc-300">{placeholder}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact info field with icon + editable value                     */
/* ------------------------------------------------------------------ */

function InfoField({
  icon,
  label,
  value,
  field,
  onSave,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  field: string;
  onSave: (field: string, value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase text-zinc-400">{label}</p>
        <EditableText
          value={value}
          field={field}
          onSave={onSave}
          className="text-sm text-zinc-700"
          placeholder={label}
        />
      </div>
    </div>
  );
}
