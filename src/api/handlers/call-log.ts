import { createServerClient } from "@/db/client";
import { HandlerResult } from "@/lib/types";

const VALID_OUTCOMES = [
  // Call outcomes
  "no_answer",
  "voicemail",
  "not_interested",
  "follow_up",
  "moved_to_campaign",
  "booked_meeting",
  // Email outcomes
  "emailed",
  "follow_up_email",
  "moved_to_calls",
];

export async function listCallLogs(contactId: string): Promise<HandlerResult> {
  const db = createServerClient();
  const { data, error } = await db
    .from("call_log")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: { logs: data } };
}

export async function createCallLog(
  contactId: string,
  body: Record<string, unknown>
): Promise<HandlerResult> {
  const { outcome, notes } = body;

  if (!outcome || typeof outcome !== "string") {
    return { status: 400, body: { error: "outcome is required" } };
  }
  if (!VALID_OUTCOMES.includes(outcome)) {
    return {
      status: 400,
      body: { error: `outcome must be one of: ${VALID_OUTCOMES.join(", ")}` },
    };
  }

  const db = createServerClient();

  // Verify contact exists
  const { data: contact, error: contactErr } = await db
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .maybeSingle();

  if (contactErr) return { status: 500, body: { error: contactErr.message } };
  if (!contact) return { status: 404, body: { error: "Contact not found" } };

  const { data, error } = await db
    .from("call_log")
    .insert({
      contact_id: contactId,
      outcome,
      notes: typeof notes === "string" ? notes : null,
    })
    .select()
    .single();

  if (error) return { status: 500, body: { error: error.message } };
  return { status: 201, body: data };
}
