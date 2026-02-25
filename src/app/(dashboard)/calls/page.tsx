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
import { CallQueue } from "./call-queue";
import { CallPanel } from "./call-panel";

export type CallOutcome =
  | "no_answer"
  | "voicemail"
  | "not_interested"
  | "follow_up"
  | "moved_to_campaign"
  | "booked_meeting";

export default function CallListPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Load call list — all ready contacts with disposition=call
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchContacts({
          status: ["ready"],
          disposition: "call",
          sort_by: "updated_at",
          sort_dir: "desc",
          limit: 200,
        });
        // Sort: overdue follow-ups first, then no date, then future follow-ups
        const sorted = sortByPriority(data.contacts);
        setContacts(sorted);
        if (sorted.length > 0) {
          setSelectedId(sorted[0].id);
        }
      } catch {
        toast("Failed to load call list", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  // Load detail + call logs when selection changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setCallLogs([]);
      return;
    }
    setDetailLoading(true);
    Promise.all([fetchContact(selectedId), fetchCallLogs(selectedId)])
      .then(([contactData, logsData]: [ContactDetail, CallLogsResponse]) => {
        setDetail(contactData);
        setCallLogs(logsData.logs);
      })
      .catch(() => toast("Failed to load contact", "error"))
      .finally(() => setDetailLoading(false));
  }, [selectedId, toast]);

  // Handle call outcome
  const handleCallAction = useCallback(
    async (outcome: CallOutcome, opts?: { notes?: string; followUpAt?: string }) => {
      if (!selectedId || !detail) return;

      try {
        // 1. Log the call
        await createCallLog(selectedId, {
          outcome,
          notes: opts?.notes,
        });

        // 2. Apply side effects based on outcome
        switch (outcome) {
          case "no_answer": {
            const followUp = new Date();
            followUp.setDate(followUp.getDate() + 2);
            await patchContact(selectedId, { follow_up_at: followUp.toISOString() });
            toast("Logged — follow up in 2 days");
            // Move to bottom of list
            setContacts((prev) => {
              const contact = prev.find((c) => c.id === selectedId);
              if (!contact) return prev;
              const rest = prev.filter((c) => c.id !== selectedId);
              return [...rest, { ...contact, follow_up_at: followUp.toISOString() }];
            });
            // Select next
            selectNext();
            break;
          }
          case "voicemail": {
            const followUp = new Date();
            followUp.setDate(followUp.getDate() + 3);
            await patchContact(selectedId, { follow_up_at: followUp.toISOString() });
            toast("Voicemail logged — follow up in 3 days");
            setContacts((prev) => {
              const contact = prev.find((c) => c.id === selectedId);
              if (!contact) return prev;
              const rest = prev.filter((c) => c.id !== selectedId);
              return [...rest, { ...contact, follow_up_at: followUp.toISOString() }];
            });
            selectNext();
            break;
          }
          case "not_interested": {
            await patchContact(selectedId, { status: "dead" });
            toast("Marked as not interested");
            removeAndSelectNext();
            break;
          }
          case "follow_up": {
            if (!opts?.followUpAt) return;
            await patchContact(selectedId, { follow_up_at: opts.followUpAt });
            toast("Follow-up scheduled");
            setContacts((prev) => {
              const contact = prev.find((c) => c.id === selectedId);
              if (!contact) return prev;
              const rest = prev.filter((c) => c.id !== selectedId);
              return sortByPriority([
                ...rest,
                { ...contact, follow_up_at: opts.followUpAt! },
              ]);
            });
            selectNext();
            break;
          }
          case "moved_to_campaign": {
            await patchContact(selectedId, { disposition: "campaign" });
            toast("Moved to email campaign");
            removeAndSelectNext();
            break;
          }
          case "booked_meeting": {
            await patchContact(selectedId, {
              status: "booked",
              ball_in_court: "scheduled",
              ball_in_court_note: opts?.notes || "Meeting booked",
              follow_up_at: opts?.followUpAt ?? null,
            });
            toast("Meeting booked!");
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

  function selectNext() {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === selectedId);
      const nextIdx = idx + 1 < prev.length ? idx + 1 : idx - 1;
      setSelectedId(prev[nextIdx]?.id ?? prev[0]?.id ?? null);
      return prev;
    });
  }

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
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Call List</h1>
          <p className="text-xs text-zinc-500">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} to call
          </p>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className={`${selectedId ? "hidden md:contents" : "contents"}`}>
          <CallQueue
            contacts={contacts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className={`${selectedId ? "contents" : "hidden md:contents"}`}>
          <CallPanel
            contact={detail}
            loading={detailLoading}
            callLogs={callLogs}
            onAction={handleCallAction}
            onBack={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}

/** Sort contacts by call priority: overdue first, then no date, then future */
function sortByPriority(contacts: ContactListItem[]): ContactListItem[] {
  const now = Date.now();
  return [...contacts].sort((a, b) => {
    const aTime = a.follow_up_at ? new Date(a.follow_up_at).getTime() : 0;
    const bTime = b.follow_up_at ? new Date(b.follow_up_at).getTime() : 0;
    const aOverdue = a.follow_up_at ? aTime <= now : false;
    const bOverdue = b.follow_up_at ? bTime <= now : false;
    const aFuture = a.follow_up_at ? aTime > now : false;
    const bFuture = b.follow_up_at ? bTime > now : false;

    // Overdue first (most overdue at top)
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aOverdue && bOverdue) return aTime - bTime;

    // No date next
    if (!a.follow_up_at && bFuture) return -1;
    if (aFuture && !b.follow_up_at) return 1;

    // Future last (soonest first)
    if (aFuture && bFuture) return aTime - bTime;

    return 0;
  });
}
