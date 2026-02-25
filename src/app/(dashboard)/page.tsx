"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  fetchStats,
  fetchContacts,
  fetchContact,
  patchContact,
  type StatsResponse,
  type ContactListItem,
  type ContactDetail,
} from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";
import { Skeleton } from "@/components/skeleton";
import { QueueList } from "./queue-list";
import { ContactPanel } from "./contact-panel";

export default function DashboardPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [queue, setQueue] = useState<ContactListItem[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Initial load — queue = contacts with status "researched" awaiting triage
  useEffect(() => {
    async function load() {
      try {
        const [statsData, researched] = await Promise.all([
          fetchStats(),
          fetchContacts({
            status: ["researched"],
            sort_by: "updated_at",
            sort_dir: "desc",
            limit: 100,
          }),
        ]);
        setStats(statsData);
        setQueue(researched.contacts);
        setQueueTotal(researched.total);
        if (researched.contacts.length > 0) {
          setSelectedId(researched.contacts[0].id);
        }
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load detail when selection changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchContact(selectedId)
      .then(setDetail)
      .catch(() => toast("Failed to load contact", "error"))
      .finally(() => setDetailLoading(false));
  }, [selectedId, toast]);

  // Inline edit handler — updates both detail and queue optimistically
  const handleContactUpdate = useCallback(
    (contactId: string, updates: Record<string, unknown>) => {
      setDetail((prev) =>
        prev && prev.id === contactId ? { ...prev, ...updates } : prev
      );
      setQueue((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, ...updates } : c
        )
      );
    },
    []
  );

  // Action handler — sets both status and disposition
  const handleAction = useCallback(
    async (action: "campaign" | "call" | "reject") => {
      if (!selectedId) return;
      const newStatus = action === "reject" ? "dead" : "ready";
      const disposition = action === "reject" ? null : action;
      try {
        await patchContact(selectedId, { status: newStatus, disposition });
        const label =
          action === "campaign"
            ? "Enrolled in campaign"
            : action === "call"
              ? "Queued for call"
              : "Contact rejected";
        toast(label);

        // Remove from queue, auto-select next
        const idx = queue.findIndex((c) => c.id === selectedId);
        const newQueue = queue.filter((c) => c.id !== selectedId);
        setQueue(newQueue);
        setQueueTotal((t) => t - 1);

        const nextIdx = Math.min(idx, newQueue.length - 1);
        setSelectedId(newQueue[nextIdx]?.id ?? null);

        // Optimistic stats update — contact moves from researched → ready or researched → dead
        setStats((prev) =>
          prev
            ? {
                ...prev,
                contacts: {
                  ...prev.contacts,
                  researched: prev.contacts.researched - 1,
                  ...(newStatus === "ready"
                    ? { ready: prev.contacts.ready + 1 }
                    : { dead: prev.contacts.dead + 1 }),
                },
              }
            : prev
        );
      } catch {
        toast("Action failed", "error");
      }
    },
    [selectedId, queue, detail, toast]
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
        <div className="flex flex-1">
          <div className="w-full md:w-80 shrink-0 space-y-3 border-r border-zinc-200 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <div className="hidden md:block flex-1 space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {stats && <FunnelStrip stats={stats} queueCount={queueTotal} />}

      <div className="flex flex-1 min-h-0">
        <div className={`${selectedId ? "hidden md:contents" : "contents"}`}>
          <QueueList
            contacts={queue}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className={`${selectedId ? "contents" : "hidden md:contents"}`}>
          <ContactPanel
            contact={detail}
            loading={detailLoading}
            onAction={handleAction}
            onContactUpdate={handleContactUpdate}
            onBack={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}

function FunnelStrip({
  stats,
  queueCount,
}: {
  stats: StatsResponse;
  queueCount: number;
}) {
  const stages = [
    { label: "Incoming", count: stats.raw_leads.pending, color: "bg-amber-500", href: "/raw-leads?status=pending" },
    { label: "New", count: stats.contacts.new, color: "bg-blue-500", href: "/contacts?status=new" },
    { label: "Researched", count: stats.contacts.researched, color: "bg-indigo-500", href: "/contacts?status=researched" },
    { label: "Ready", count: stats.contacts.ready, color: "bg-green-500", href: "/contacts?status=ready" },
    { label: "Booked", count: stats.contacts.booked, color: "bg-emerald-500", href: "/pipeline" },
  ];

  const dropped = stats.raw_leads.rejected + stats.contacts.dead;

  return (
    <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-3 md:px-6 py-3 overflow-x-auto">
      <span className="mr-3 text-xs font-medium text-zinc-400">Pipeline</span>
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center">
          <Link
            href={s.href}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs transition-colors hover:border-zinc-300"
          >
            <span className={`h-2 w-2 rounded-full ${s.color}`} />
            <span className="font-medium text-zinc-700">{s.count}</span>
            <span className="text-zinc-400">{s.label}</span>
          </Link>
          {i < stages.length - 1 ? (
            <ArrowRight size={12} className="mx-1 text-zinc-300" />
          ) : null}
        </div>
      ))}
      {dropped > 0 ? (
        <span className="ml-auto text-xs text-zinc-400">
          {stats.raw_leads.rejected > 0 ? `${stats.raw_leads.rejected} rejected` : ""}
          {stats.raw_leads.rejected > 0 && stats.contacts.dead > 0 ? " \u00b7 " : ""}
          {stats.contacts.dead > 0 ? `${stats.contacts.dead} dead` : ""}
        </span>
      ) : null}
    </div>
  );
}
