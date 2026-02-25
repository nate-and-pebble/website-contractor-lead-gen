"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import {
  fetchContacts,
  patchContact,
  type ContactListItem,
  type ContactsParams,
} from "@/lib/api-client";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { downloadCsv } from "@/lib/csv";

const STATUS_OPTIONS = ["new", "researched", "ready", "booked", "dead"] as const;
const LIMIT = 50;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function hasResearchData(c: ContactListItem): boolean {
  return Array.isArray(c.contact_research) && c.contact_research.length > 0;
}

function getResearchSummary(c: ContactListItem): string {
  if (!Array.isArray(c.contact_research) || c.contact_research.length === 0) return "";
  const r = c.contact_research[0] as { summary?: string | null };
  return r?.summary ?? "";
}

function exportContacts(contacts: ContactListItem[]) {
  const headers = [
    "First Name", "Last Name", "Email", "Phone", "Title",
    "Company", "Status", "Disposition", "Quality Score", "Research Summary", "Created Date",
  ];
  const rows = contacts.map((c) => [
    c.first_name,
    c.last_name,
    c.email ?? "",
    c.phone ?? "",
    c.title ?? "",
    c.company ?? "",
    c.status,
    c.disposition ?? "",
    String(c.quality_score ?? ""),
    getResearchSummary(c),
    formatDate(c.created_at),
  ]);
  downloadCsv(headers, rows, `contacts-${new Date().toISOString().slice(0, 10)}.csv`);
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-8"><TableSkeleton rows={10} cols={8} /></div>}>
      <ContactsContent />
    </Suspense>
  );
}

function ContactsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Filters — sync from URL on every navigation
  const urlStatus = searchParams.getAll("status");
  const urlSearch = searchParams.get("search") ?? "";
  const urlResearch = searchParams.get("has_research") === "true" ? true : undefined;
  const urlDisposition = searchParams.get("disposition") ?? undefined;

  const [statusFilter, setStatusFilter] = useState<string[]>(urlStatus);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
  const [researchFilter, setResearchFilter] = useState<boolean | undefined>(urlResearch);
  const [dispositionFilter, setDispositionFilter] = useState<string | undefined>(urlDisposition);

  // Re-sync local state when URL search params change (e.g. sidebar navigation)
  const urlKey = searchParams.toString();
  useEffect(() => {
    setStatusFilter(urlStatus);
    setSearchInput(urlSearch);
    setDebouncedSearch(urlSearch);
    setResearchFilter(urlResearch);
    setDispositionFilter(urlDisposition);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);

  // Sort
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Data
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [searchInput]);

  // Fetch contacts
  const loadContacts = useCallback(
    async (offset = 0, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      try {
        const params: ContactsParams = {
          status: statusFilter.length > 0 ? statusFilter : undefined,
          search: debouncedSearch || undefined,
          has_research: researchFilter,
          disposition: dispositionFilter,
          sort_by: sortBy,
          sort_dir: sortDir,
          limit: LIMIT,
          offset,
        };
        const data = await fetchContacts(params);
        if (append) {
          setContacts((prev) => [...prev, ...data.contacts]);
        } else {
          setContacts(data.contacts);
        }
        setTotal(data.total);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to load contacts", "error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, debouncedSearch, researchFilter, dispositionFilter, sortBy, sortDir, toast]
  );

  useEffect(() => {
    setContacts([]);
    setSelected(new Set());
    loadContacts(0);
  }, [loadContacts]);

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
        setSelected(new Set());
        setBulkStatusOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Status change (inline)
  const handleStatusChange = async (id: string, newStatus: string) => {
    const prev = contacts.find((c) => c.id === id);
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    try {
      await patchContact(id, { status: newStatus });
      toast("Contact updated");
    } catch {
      if (prev) setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, status: prev.status } : c)));
      toast("Failed to update", "error");
    }
  };

  // Sort
  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // Selection
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  };

  // Status filter toggle
  const toggleStatus = (s: string) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  // Bulk actions
  const handleBulkStatus = async (newStatus: string) => {
    const ids = Array.from(selected);
    setContacts((cs) =>
      cs.map((c) => (ids.includes(c.id) ? { ...c, status: newStatus } : c))
    );
    setSelected(new Set());
    setBulkStatusOpen(false);
    try {
      await Promise.all(ids.map((id) => patchContact(id, { status: newStatus })));
      toast(`Updated ${ids.length} contacts`);
    } catch {
      loadContacts(0);
      toast("Some updates failed", "error");
    }
  };

  const handleExportSelected = () => {
    const sel = contacts.filter((c) => selected.has(c.id));
    exportContacts(sel);
    toast(`Exported ${sel.length} contacts`);
  };

  const handleExportAll = async () => {
    try {
      const data = await fetchContacts({
        status: statusFilter.length > 0 ? statusFilter : undefined,
        search: debouncedSearch || undefined,
        has_research: researchFilter,
        limit: 5000,
      });
      exportContacts(data.contacts);
      toast(`Exported ${data.contacts.length} contacts`);
    } catch {
      toast("Export failed", "error");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-8 py-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Contacts</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {total > 0 ? `${contacts.length} of ${total} contacts` : "Manage your contact pipeline"}
          </p>
        </div>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <Download size={16} />
          Export All
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 border-b border-zinc-100 bg-white px-4 md:px-8 py-3">
        {/* Status chips */}
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter.includes(s)
                  ? s === "new"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : s === "researched"
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : s === "ready"
                        ? "border-green-300 bg-green-50 text-green-700"
                        : s === "booked"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-zinc-300 bg-zinc-100 text-zinc-600"
                  : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search name, email, company... ( / )"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Disposition chips */}
        <div className="flex gap-1.5">
          {(["campaign", "call"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDispositionFilter((f) => (f === d ? undefined : d))}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                dispositionFilter === d
                  ? d === "campaign"
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Has research toggle */}
        <button
          onClick={() => setResearchFilter((f) => (f === true ? undefined : true))}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            researchFilter === true
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
          }`}
        >
          <Check size={12} />
          Researched
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8">
            <TableSkeleton rows={10} cols={8} />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <p className="text-sm font-medium text-zinc-500">No contacts found</p>
            <p className="mt-1 text-xs text-zinc-400">
              {statusFilter.length > 0 || debouncedSearch || researchFilter
                ? "Try adjusting your filters"
                : "Contacts will appear here once leads are promoted from the pipeline"}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === contacts.length && contacts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-zinc-300"
                    />
                  </th>
                  <ThSort col="first_name" label="Name" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                  <ThSort col="email" label="Email" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                  <th className="px-4 py-3">Title</th>
                  <ThSort col="company" label="Company" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                  <ThSort col="status" label="Status" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                  <ThSort col="disposition" label="Disposition" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                  <ThSort col="quality_score" label="Score" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                  <th className="px-4 py-3">Research</th>
                  <ThSort col="created_at" label="Created" sortBy={sortBy} sortDir={sortDir} onClick={handleSort} />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/contacts/${c.id}`)}
                    className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-zinc-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{c.email ?? "—"}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-zinc-600">
                      {c.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{c.company ?? "—"}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge
                        status={c.status}
                        type="contact"
                        editable
                        onChange={(s) => handleStatusChange(c.id, s)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {c.disposition ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          c.disposition === "campaign"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {c.disposition}
                        </span>
                      ) : (
                        <span className="text-zinc-300">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {c.quality_score != null ? (
                        <span className="font-mono text-xs">{c.quality_score}/5</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasResearchData(c) ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <span className="text-zinc-200">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Load more */}
            {contacts.length < total && (
              <div className="flex justify-center border-t border-zinc-100 py-4">
                <button
                  onClick={() => loadContacts(contacts.length, true)}
                  disabled={loadingMore}
                  className="rounded-lg border border-zinc-200 bg-white px-6 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : `Load more (${total - contacts.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-zinc-200 bg-white px-4 md:px-8 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <span className="text-sm font-medium text-zinc-600">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            {/* Bulk status */}
            <div className="relative">
              <button
                onClick={() => setBulkStatusOpen(!bulkStatusOpen)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Set status
              </button>
              {bulkStatusOpen && (
                <div className="absolute bottom-full left-0 mb-1 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleBulkStatus(s)}
                      className="flex w-full items-center gap-2 px-4 py-1.5 text-sm capitalize text-zinc-700 hover:bg-zinc-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Download size={14} />
              Export selected
            </button>

            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThSort({
  col,
  label,
  sortBy,
  sortDir,
  onClick,
}: {
  col: string;
  label: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  onClick: (col: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 hover:text-zinc-700"
      onClick={() => onClick(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active &&
          (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );
}
