import { createServerClient } from "@/db/client";
import { HandlerResult } from "@/lib/types";

export async function getResearch(contactId: string): Promise<HandlerResult> {
  const db = createServerClient();

  // Verify contact exists
  const { data: contact, error: cErr } = await db
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .maybeSingle();

  if (cErr) return { status: 500, body: { error: cErr.message } };
  if (!contact) return { status: 404, body: { error: "Contact not found" } };

  const { data, error } = await db
    .from("contact_research")
    .select("*")
    .eq("contact_id", contactId)
    .maybeSingle();

  if (error) return { status: 500, body: { error: error.message } };
  if (!data)
    return { status: 404, body: { error: "No research found for this contact" } };

  return { status: 200, body: data };
}

export async function upsertResearch(
  contactId: string,
  body: Record<string, unknown>
): Promise<HandlerResult> {
  const db = createServerClient();

  const { summary, research_data } = body;

  if (research_data === undefined || typeof research_data !== "object" || research_data === null) {
    return { status: 400, body: { error: "research_data object is required" } };
  }

  // Verify contact exists
  const { data: contact, error: cErr } = await db
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .maybeSingle();

  if (cErr) return { status: 500, body: { error: cErr.message } };
  if (!contact) return { status: 404, body: { error: "Contact not found" } };

  const now = new Date().toISOString();

  const { data, error } = await db
    .from("contact_research")
    .upsert(
      {
        contact_id: contactId,
        summary: summary !== undefined ? summary : null,
        research_data,
        researched_at: now,
      },
      { onConflict: "contact_id" }
    )
    .select()
    .single();

  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: data };
}
