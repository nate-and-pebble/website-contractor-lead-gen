"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  X as XIcon,
  Ban,
} from "lucide-react";
import {
  fetchRawLeads,
  patchRawLead,
  type RawLeadsParams,
} from "@/lib/api-client";
import type { RawLead } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { JsonDisplay } from "@/components/json-display";
import { TableSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { downloadCsv } from "@/lib/csv";

const STATUS_OPTIONS = ["pending", "qualified", "rejected"] as const;
const LIMIT = 50;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function exportLeads(leads: RawLead[]) {
  const headers = [
    "Name", "Email", "Title", "Company", "Source",
    "Status", "Found Via", "Rejection Reason", "Created Date",
  ];
  const rows = leads.map((l) => [
    l.name ?? "",
    l.email ?? "",
    l.title ?? "",
    l.company ?? "",
    l.source,
    l.status,
    l.found_via ?? "",
    l.rejection_reason ?? "",
    formatDate(l.created_at),
  ]);
  downloadCsv(headers, rows, `raw-leads-${new Date().toISOString().slice(0, 10)}.csv`);
}

export default function RawLeadsPage() {
  return (
    <Suspense fallback={<div className="p-8"><TableSkeleton rows={10} cols={7} /></div>}>
      <RawLeadsContent />
    </Suspense>
  );
}

function RawLeadsContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const s = searchParams.getAll("status");
    return s.length > 0 ? s : ["pending"];
  });
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Data
  const [leads, setLeads] = useState<RawLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Expand
  const [expandedId, setExpandedId] = useState<string | null>(
    searchParams.get("highlight")
  );

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [searchInput]);

  // Fetch
  const loadLeads = useCallback(
    async (offset = 0, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      try {
        const params: RawLeadsParams = {
          status: statusFilter.length > 0 ? statusFilter : undefined,
          search: debouncedSearch || undefined,
          limit: LIMIT,
          offset,
        };
        const data = await fetchRawLeads(params);
        if (append) {
          setLeads((prev) => [...prev, ...data.leads]);
        } else {
          setLeads(data.leads);
        }
        setTotal(data.total);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to load leads", "error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, debouncedSearch, toast]
  );

  useEffect(() => {
    setLeads([]);
    loadLeads(0);
  }, [loadLeads]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
      if (e.key === "Escape") {
        setExpandedId(null);
        setRejectingId(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reject handler
  const handleReject = async () => {
    if (!rejectingId) return;
    try {
      await patchRawLead(rejectingId, {
        status: "rejected",
        rejection_reason: rejectReason || undefined,
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === rejectingId
            ? { ...l, status: "rejected", rejection_reason: rejectReason || null }
            : l
        )
      );
      toast("Lead rejected");
    } catch {
      toast("Failed to reject lead", "error");
    } finally {
      setRejectingId(null);
      setRejectReason("");
    }
  };

  // Status filter toggle
  const toggleStatus = (s: string) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleExportAll = async () => {
    try {
      const data = await fetchRawLeads({
        status: statusFilter.length > 0 ? statusFilter : undefined,
        search: debouncedSearch || undefined,
        limit: 5000,
      });
      exportLeads(data.leads);
      toast(`Exported ${data.leads.length} leads`);
    } catch {
      toast("Export failed", "error");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Raw Leads</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {total > 0
              ? `${leads.length} of ${total} leads`
              : "The incoming lead queue"}
          </p>
        </div>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Download size={16} />
          Export All
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 bg-white px-8 py-3">
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter.includes(s)
                  ? s === "pending"
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : s === "qualified"
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-red-300 bg-red-50 text-red-700"
                  : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search name, email, company... ( / )"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8">
            <TableSkeleton rows={10} cols={7} />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <p className="text-sm font-medium text-zinc-500">No leads found</p>
            <p className="mt-1 text-xs text-zinc-400">
              {statusFilter.length > 0 || debouncedSearch
                ? "Try adjusting your filters"
                : "Leads will appear here once the automation starts fetching from ZoomInfo"}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Found Via</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="w-20 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <LeadRow
                    key={l.id}
                    lead={l}
                    expanded={expandedId === l.id}
                    onToggle={() =>
                      setExpandedId((prev) => (prev === l.id ? null : l.id))
                    }
                    onReject={() => {
                      setRejectingId(l.id);
                      setRejectReason("");
                    }}
                  />
                ))}
              </tbody>
            </table>

            {leads.length < total && (
              <div className="flex justify-center border-t border-zinc-100 py-4">
                <button
                  onClick={() => loadLeads(leads.length, true)}
                  disabled={loadingMore}
                  className="rounded-lg border border-zinc-200 bg-white px-6 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {loadingMore
                    ? "Loading..."
                    : `Load more (${total - leads.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Reject Lead</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Provide a reason for rejecting this lead (optional).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="mt-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason("");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  expanded,
  onToggle,
  onReject,
}: {
  lead: RawLead;
  expanded: boolean;
  onToggle: () => void;
  onReject: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
      >
        <td className="px-4 py-3 font-medium text-zinc-900">
          <span className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronDown size={14} className="shrink-0 text-zinc-400" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-zinc-400" />
            )}
            {lead.name || "—"}
          </span>
        </td>
        <td className="px-4 py-3 text-zinc-600">{lead.email || "—"}</td>
        <td className="max-w-[160px] truncate px-4 py-3 text-zinc-600">
          {lead.title || "—"}
        </td>
        <td className="px-4 py-3 text-zinc-600">{lead.company || "—"}</td>
        <td className="px-4 py-3">
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {lead.source}
          </span>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={lead.status} type="raw-lead" />
        </td>
        <td className="max-w-[140px] truncate px-4 py-3 text-xs text-zinc-500">
          {lead.found_via || "—"}
        </td>
        <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">
          {formatDate(lead.created_at)}
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {lead.status === "pending" && (
            <button
              onClick={onReject}
              className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Ban size={12} />
              Reject
            </button>
          )}
          {lead.status === "qualified" && lead.promoted_to_contact_id && (
            <Link
              href={`/contacts/${lead.promoted_to_contact_id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              View contact
            </Link>
          )}
          {lead.status === "rejected" && lead.rejection_reason && (
            <span
              title={lead.rejection_reason}
              className="cursor-help text-xs text-zinc-400 underline decoration-dotted"
            >
              Reason
            </span>
          )}
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr>
          <td colSpan={9} className="bg-zinc-50 px-8 py-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <DetailField label="Source" value={lead.source} />
                <DetailField label="Source URL" value={lead.source_url} link />
                <DetailField label="Source ID" value={lead.source_id} />
                <DetailField label="Found Via" value={lead.found_via} />
                <DetailField label="Status" value={lead.status} />
                {lead.rejection_reason && (
                  <DetailField label="Rejection Reason" value={lead.rejection_reason} />
                )}
                {lead.promoted_to_contact_id && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Promoted To</p>
                    <Link
                      href={`/contacts/${lead.promoted_to_contact_id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View contact
                    </Link>
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Raw Data
                </p>
                {Object.keys(lead.raw_data).length > 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <JsonDisplay data={lead.raw_data} />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 italic">No raw data</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailField({
  label,
  value,
  link,
}: {
  label: string;
  value?: string | null;
  link?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      {link && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline break-all"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm text-zinc-800">{value || "—"}</p>
      )}
    </div>
  );
}
