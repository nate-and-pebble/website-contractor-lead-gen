"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Star,
  Pencil,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Globe,
  Mic,
  Video,
  FileText,
} from "lucide-react";
import { fetchContact, patchContact, type ContactDetail } from "@/lib/api-client";
import { StatusBadge } from "@/components/status-badge";
import { JsonDisplay } from "@/components/json-display";
import { DetailSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";

const typeIcons: Record<string, typeof BookOpen> = {
  blog: BookOpen,
  podcast: Mic,
  video: Video,
  article: FileText,
  website: Globe,
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    title: "",
    company: "",
  });
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [zoominfoOpen, setZoominfoOpen] = useState(false);

  useEffect(() => {
    fetchContact(id)
      .then((data) => {
        setContact(data);
        setNotes(data.notes ?? "");
        setEditData({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email ?? "",
          phone: data.phone ?? "",
          title: data.title ?? "",
          company: data.company ?? "",
        });
      })
      .catch((err) => {
        toast(err.message ?? "Failed to load contact", "error");
      })
      .finally(() => setLoading(false));
  }, [id, toast]);

  const handleStatusChange = async (newStatus: string) => {
    if (!contact) return;
    const prev = contact.status;
    setContact({ ...contact, status: newStatus });
    try {
      await patchContact(id, { status: newStatus });
      toast("Status updated");
    } catch {
      setContact((c) => (c ? { ...c, status: prev } : c));
      toast("Failed to update status", "error");
    }
  };

  const handleScoreChange = async (score: number) => {
    if (!contact) return;
    const prev = contact.quality_score;
    setContact({ ...contact, quality_score: score });
    try {
      await patchContact(id, { quality_score: score });
      toast("Score updated");
    } catch {
      setContact((c) => (c ? { ...c, quality_score: prev } : c));
      toast("Failed to update score", "error");
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updated = await patchContact(id, editData);
      setContact((c) => (c ? { ...c, ...updated } : c));
      setEditing(false);
      toast("Contact updated");
    } catch {
      toast("Failed to save changes", "error");
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await patchContact(id, { notes });
      toast("Notes saved");
    } catch {
      toast("Failed to save notes", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <p className="text-sm text-zinc-500">Contact not found</p>
        <Link href="/contacts" className="mt-2 text-sm text-blue-600 hover:underline">
          Back to contacts
        </Link>
      </div>
    );
  }

  const research = contact.research;
  const researchData = (research?.research_data ?? {}) as Record<string, unknown>;
  const zoominfo = contact.zoominfo_lead;

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Back */}
      <button
        onClick={() => router.push("/contacts")}
        className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft size={16} />
        Back to contacts
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {editing ? (
            <div className="flex gap-2">
              <input
                value={editData.first_name}
                onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-2xl font-bold text-zinc-900"
                placeholder="First name"
              />
              <input
                value={editData.last_name}
                onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-2xl font-bold text-zinc-900"
                placeholder="Last name"
              />
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-zinc-900">
              {contact.first_name} {contact.last_name}
            </h1>
          )}
          {editing ? (
            <div className="mt-2 flex gap-2">
              <input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="rounded border border-zinc-200 px-2 py-1 text-sm text-zinc-600"
                placeholder="Title"
              />
              <span className="py-1 text-sm text-zinc-400">at</span>
              <input
                value={editData.company}
                onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                className="rounded border border-zinc-200 px-2 py-1 text-sm text-zinc-600"
                placeholder="Company"
              />
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              {[contact.title, contact.company].filter(Boolean).join(" at ") || "No title or company"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge
            status={contact.status}
            type="contact"
            editable
            onChange={handleStatusChange}
          />
          {editing ? (
            <div className="flex gap-1.5">
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <Save size={14} /> Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Quality Score */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">Quality:</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => handleScoreChange(n)}
              className="transition-colors"
            >
              <Star
                size={18}
                className={
                  n <= (contact.quality_score ?? 0)
                    ? "fill-amber-400 text-amber-400"
                    : "text-zinc-300"
                }
              />
            </button>
          ))}
        </div>
        {contact.quality_score && (
          <span className="text-xs text-zinc-400">{contact.quality_score}/5</span>
        )}
      </div>

      {/* Contact Info */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Contact Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow
            icon={<Mail size={16} />}
            label="Email"
            editing={editing}
            value={editing ? editData.email : contact.email}
            onChange={(v) => setEditData({ ...editData, email: v })}
            href={contact.email ? `mailto:${contact.email}` : undefined}
          />
          <InfoRow
            icon={<Phone size={16} />}
            label="Phone"
            editing={editing}
            value={editing ? editData.phone : contact.phone}
            onChange={(v) => setEditData({ ...editData, phone: v })}
            href={contact.phone ? `tel:${contact.phone}` : undefined}
          />
          <InfoRow
            icon={<Building2 size={16} />}
            label="Company"
            value={contact.company}
          />
          <InfoRow
            icon={<Briefcase size={16} />}
            label="Title"
            value={contact.title}
          />
        </div>
      </div>

      {/* Research Section */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Research Intel
        </h2>

        {research ? (
          <div className="space-y-4">
            {/* Summary */}
            {research.summary ? (
              <div className="rounded-xl border-l-4 border-blue-400 bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-900">{research.summary}</p>
              </div>
            ) : null}

            {/* Professional Background */}
            {researchData.professional_background != null ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">Professional Background</h3>
                <JsonDisplay data={researchData.professional_background} />
              </div>
            ) : null}

            {/* Content & Appearances */}
            {Array.isArray(researchData.content_appearances) &&
            researchData.content_appearances.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                  Content & Appearances
                </h3>
                <div className="space-y-3">
                  {(researchData.content_appearances as Array<Record<string, unknown>>).map(
                    (item, i) => {
                      const IconComponent =
                        typeIcons[String(item.type ?? "")] ?? FileText;
                      return (
                        <div
                          key={i}
                          className="flex gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3"
                        >
                          <IconComponent
                            size={18}
                            className="mt-0.5 shrink-0 text-zinc-400"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {item.source_url ? (
                                <a
                                  href={String(item.source_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:underline"
                                >
                                  {String(item.title ?? "Untitled")}
                                  <ExternalLink
                                    size={12}
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
                              <p className="mt-1 text-sm text-zinc-600">
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
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                  Contact Info Found
                </h3>
                <JsonDisplay data={researchData.contact_info_found} />
              </div>
            ) : null}

            {/* Personal Hooks */}
            {Array.isArray(researchData.personal_hooks) &&
            researchData.personal_hooks.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                  Personal Hooks
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(researchData.personal_hooks as string[]).map((hook, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700"
                    >
                      {hook}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Remaining research data */}
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
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                    Additional Research Data
                  </h3>
                  <JsonDisplay data={extra} />
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">
              No research yet. This contact hasn&apos;t been researched by the automation.
            </p>
          </div>
        )}
      </div>

      {/* ZoomInfo Section */}
      {zoominfo ? (
        <div className="mt-6">
          <button
            onClick={() => setZoominfoOpen(!zoominfoOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left transition-colors hover:bg-zinc-50"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              ZoomInfo Data
            </h2>
            {zoominfoOpen ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
          </button>
          {zoominfoOpen && (
            <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
              {/* Basic info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <ZiField label="Seniority" value={zoominfo.seniority} />
                <ZiField label="Company" value={zoominfo.company_name} />
                <ZiField label="Industry" value={zoominfo.company_industry} />
                <ZiField label="Company Size" value={zoominfo.company_size} />
                <ZiField label="Location" value={zoominfo.company_location} />
                <ZiField label="Verification" value={zoominfo.verification_status} />
                <ZiField label="Direct Phone" value={zoominfo.direct_phone} />
                <ZiField label="Mobile" value={zoominfo.mobile_phone} />
                <ZiField label="Work Phone" value={zoominfo.work_phone} />
                <ZiField label="Direct Email" value={zoominfo.direct_email} />
              </div>

              {/* Employment History */}
              {zoominfo.employment_history != null ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Employment History
                  </h3>
                  <JsonDisplay data={zoominfo.employment_history} />
                </div>
              ) : null}

              {/* Technographics */}
              {zoominfo.technographics != null ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Technographics
                  </h3>
                  <JsonDisplay data={zoominfo.technographics} />
                </div>
              ) : null}

              {/* Intent Signals */}
              {zoominfo.intent_signals != null ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Intent Signals
                  </h3>
                  <JsonDisplay data={zoominfo.intent_signals} />
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {/* Notes */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Notes
        </h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Add notes about this contact..."
            rows={4}
            className="w-full resize-none border-0 bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
          />
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="text-xs text-zinc-400">
              {savingNotes ? "Saving..." : "Auto-saves on blur"}
            </span>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="rounded-lg bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Raw lead link */}
      <div className="mt-6 text-center">
        <p className="text-xs text-zinc-400">
          Created {formatDate(contact.created_at)}
          {contact.updated_at !== contact.created_at &&
            ` · Updated ${formatDate(contact.updated_at)}`}
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
  editing,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  href?: string;
  editing?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-400">{label}</p>
        {editing && onChange ? (
          <input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded border border-zinc-200 px-2 py-0.5 text-sm text-zinc-800"
            placeholder={label}
          />
        ) : href && value ? (
          <a href={href} className="text-sm text-blue-600 hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-sm text-zinc-800">{value || "—"}</p>
        )}
      </div>
    </div>
  );
}

function ZiField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm text-zinc-800">{value || "—"}</p>
    </div>
  );
}
