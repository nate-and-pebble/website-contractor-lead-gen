import { createServerClient } from "@/db/client";
import { HandlerResult } from "@/lib/types";

export async function getStats(): Promise<HandlerResult> {
  const db = createServerClient();

  const [
    rlPending,
    rlQualified,
    rlRejected,
    rlTotal,
    cNew,
    cResearched,
    cReady,
    cBooked,
    cDead,
    cTotal,
  ] = await Promise.all([
    db.from("raw_leads").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("raw_leads").select("*", { count: "exact", head: true }).eq("status", "qualified"),
    db.from("raw_leads").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    db.from("raw_leads").select("*", { count: "exact", head: true }),
    db.from("contacts").select("*", { count: "exact", head: true }).eq("status", "new"),
    db.from("contacts").select("*", { count: "exact", head: true }).eq("status", "researched"),
    db.from("contacts").select("*", { count: "exact", head: true }).eq("status", "ready"),
    db.from("contacts").select("*", { count: "exact", head: true }).eq("status", "booked"),
    db.from("contacts").select("*", { count: "exact", head: true }).eq("status", "dead"),
    db.from("contacts").select("*", { count: "exact", head: true }),
  ]);

  // Check for errors
  const allResults = [rlPending, rlQualified, rlRejected, rlTotal, cNew, cResearched, cReady, cBooked, cDead, cTotal];
  const firstError = allResults.find((r) => r.error);
  if (firstError?.error) {
    return { status: 500, body: { error: firstError.error.message } };
  }

  return {
    status: 200,
    body: {
      raw_leads: {
        pending: rlPending.count ?? 0,
        qualified: rlQualified.count ?? 0,
        rejected: rlRejected.count ?? 0,
        total: rlTotal.count ?? 0,
      },
      contacts: {
        new: cNew.count ?? 0,
        researched: cResearched.count ?? 0,
        ready: cReady.count ?? 0,
        booked: cBooked.count ?? 0,
        dead: cDead.count ?? 0,
        total: cTotal.count ?? 0,
      },
    },
  };
}
