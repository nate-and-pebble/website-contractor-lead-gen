"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchContacts,
  fetchContact,
  fetchCallLogs,
  patchContact,
  createCallLog,
  type ContactListItem,
  type ContactDetail,
  type CallLogsResponse,
} from "@/lib/api-client";
import type { CallLog } from "@/lib/types";
import { useToast } from "@/components/toast-provider";
import { Skeleton } from "@/components/skeleton";
import { CampaignQueue } from "./campaign-queue";
import { CampaignPanel } from "./campaign-panel";

export type EmailOutcome =
  | "emailed"
  | "follow_up_email"
  | "moved_to_calls"
  | "booked_meeting"
  | "not_interested";

export default function CampaignPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<CallLog[]>([]);

  // Load campaign contacts
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchContacts({
          status: ["ready"],
          disposition: "campaign",
          sort_by: "updated_at",
          sort_dir: "desc",
          limit: 200,
        });
        const sorted = sortByPriority(data.contacts);
        setContacts(sorted);
        if (sorted.length > 0) {
          setSelectedId(sorted[0].id);
        }
      } catch {
        toast("Failed to load campaign", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  // Load detail + activity when selection changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setActivityLogs([]);
      return;
    }
    setDetailLoading(true);
    Promise.all([fetchContact(selectedId), fetchCallLogs(selectedId)])
      .then(([contactData, logsData]: [ContactDetail, CallLogsResponse]) => {
        setDetail(contactData);
        setActivityLogs(logsData.logs);
      })
      .catch(() => toast("Failed to load contact", "error"))
      .finally(() => setDetailLoading(false));
  }, [selectedId, toast]);

  const handleAction = useCallback(
    async (outcome: EmailOutcome, opts?: { notes?: string; followUpAt?: string }) => {
      if (!selectedId || !detail) return;

      try {
        // Log the activity
        await createCallLog(selectedId, {
          outcome,
          notes: opts?.notes,
        });

        switch (outcome) {
          case "emailed": {
            const followUp = new Date();
            followUp.setDate(followUp.getDate() + 3);
            await patchContact(selectedId, { follow_up_at: followUp.toISOString() });
            toast("Email logged — follow up in 3 days");
            // Update contact in list with new follow_up_at
            setContacts((prev) => {
              const c = prev.find((x) => x.id === selectedId);
              if (!c) return prev;
              const rest = prev.filter((x) => x.id !== selectedId);
              return sortByPriority([...rest, { ...c, follow_up_at: followUp.toISOString() }]);
            });
            // Refresh logs
            fetchCallLogs(selectedId).then((d) => setActivityLogs(d.logs)).catch(() => {});
            break;
          }
          case "follow_up_email": {
            const followUp = new Date();
            followUp.setDate(followUp.getDate() + 3);
            await patchContact(selectedId, { follow_up_at: followUp.toISOString() });
            toast("Follow-up sent — check again in 3 days");
            setContacts((prev) => {
              const c = prev.find((x) => x.id === selectedId);
              if (!c) return prev;
              const rest = prev.filter((x) => x.id !== selectedId);
              return sortByPriority([...rest, { ...c, follow_up_at: followUp.toISOString() }]);
            });
            fetchCallLogs(selectedId).then((d) => setActivityLogs(d.logs)).catch(() => {});
            break;
          }
          case "moved_to_calls": {
            await patchContact(selectedId, { disposition: "call", follow_up_at: null });
            toast("Moved to call list");
            removeAndSelectNext();
            break;
          }
          case "booked_meeting": {
            await patchContact(selectedId, {
              status: "booked",
              ball_in_court: "scheduled",
              ball_in_court_note: opts?.notes || "Meeting booked via campaign",
              follow_up_at: opts?.followUpAt ?? null,
            });
            toast("Meeting booked!");
            removeAndSelectNext();
            break;
          }
          case "not_interested": {
            await patchContact(selectedId, { status: "dead" });
            toast("Marked as not interested");
            removeAndSelectNext();
            break;
          }
        }
      } catch {
        toast("Action failed", "error");
      }
    },
    [selectedId, detail, toast]
  );

  function removeAndSelectNext() {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === selectedId);
      const next = prev.filter((c) => c.id !== selectedId);
      const nextIdx = Math.min(idx, next.length - 1);
      setSelectedId(next[nextIdx]?.id ?? null);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-200 bg-white px-6 py-4">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="flex flex-1">
          <div className="w-80 shrink-0 space-y-3 border-r border-zinc-200 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <div className="flex-1 space-y-4 p-6">
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
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Email Campaign</h1>
          <p className="text-xs text-zinc-500">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} to email
          </p>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <CampaignQueue
          contacts={contacts}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <CampaignPanel
          contact={detail}
          loading={detailLoading}
          activityLogs={activityLogs}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}

/** Sort: overdue follow-ups first, then no date, then future */
function sortByPriority(contacts: ContactListItem[]): ContactListItem[] {
  const now = Date.now();
  return [...contacts].sort((a, b) => {
    const aTime = a.follow_up_at ? new Date(a.follow_up_at).getTime() : 0;
    const bTime = b.follow_up_at ? new Date(b.follow_up_at).getTime() : 0;
    const aOverdue = a.follow_up_at ? aTime <= now : false;
    const bOverdue = b.follow_up_at ? bTime <= now : false;
    const aFuture = a.follow_up_at ? aTime > now : false;
    const bFuture = b.follow_up_at ? bTime > now : false;

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aOverdue && bOverdue) return aTime - bTime;
    if (!a.follow_up_at && bFuture) return -1;
    if (aFuture && !b.follow_up_at) return 1;
    if (aFuture && bFuture) return aTime - bTime;
    return 0;
  });
}
