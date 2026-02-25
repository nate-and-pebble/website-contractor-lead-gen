import { createServerClient } from "@/db/client";
import { HandlerResult } from "@/lib/types";

const VALID_STATUSES = ["pending", "qualified", "rejected"];

type Db = ReturnType<typeof createServerClient>;

const MERGEABLE_FIELDS = ["source_id", "source_url", "name", "email", "title", "company", "found_via"];

/**
 * Build merge updates for upserting into an existing raw lead row.
 * Text fields: fills in nulls only (don't overwrite existing values).
 * raw_data: shallow-merges new keys (existing keys preserved).
 * Returns null if nothing to update.
 */
function buildMergeUpdates(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> | null {
  const updates: Record<string, unknown> = {};

  for (const field of MERGEABLE_FIELDS) {
    if (incoming[field] && !existing[field]) {
      updates[field] = incoming[field];
    }
  }

  const incomingData = incoming.raw_data;
  if (incomingData && typeof incomingData === "object" && Object.keys(incomingData as object).length > 0) {
    const existingData = (existing.raw_data as Record<string, unknown>) ?? {};
    const newKeys: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(incomingData as Record<string, unknown>)) {
      if (!(k in existingData)) {
        newKeys[k] = v;
      }
    }
    if (Object.keys(newKeys).length > 0) {
      updates.raw_data = { ...existingData, ...newKeys };
    }
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

/**
 * Cascade dedup: source+source_id → name+company → email.
 * Returns the first matching raw_lead row, or null.
 */
async function findExistingRawLead(
  db: Db,
  lead: { source: string; source_id?: string | null; name?: string | null; company?: string | null; email?: string | null },
): Promise<Record<string, unknown> | null> {
  // 1. source + source_id (unique constraint)
  if (lead.source_id) {
    const { data } = await db
      .from("raw_leads")
      .select("*")
      .eq("source", lead.source)
      .eq("source_id", lead.source_id)
      .maybeSingle();
    if (data) return data;
  }

  // 2. name + company (case-insensitive, both required)
  if (lead.name && lead.company) {
    const { data } = await db
      .from("raw_leads")
      .select("*")
      .ilike("name", lead.name)
      .ilike("company", lead.company)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0];
  }

  // 3. email (case-insensitive)
  if (lead.email) {
    const { data } = await db
      .from("raw_leads")
      .select("*")
      .ilike("email", lead.email)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0];
  }

  return null;
}

/**
 * Upsert: merge new non-null fields into an existing row.
 */
async function upsertExisting(
  db: Db,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Promise<{ row: Record<string, unknown>; updated: boolean } | { error: string }> {
  const updates = buildMergeUpdates(existing, incoming);
  if (updates) {
    updates.updated_at = new Date().toISOString();
    const { data, error } = await db
      .from("raw_leads")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return { error: error.message };
    return { row: data, updated: true };
  }
  return { row: existing, updated: false };
}

export async function listRawLeads(params: {
  status?: string[];
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<HandlerResult> {
  const db = createServerClient();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 5000);
  const offset = Math.max(params.offset ?? 0, 0);

  let query = db
    .from("raw_leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.status && params.status.length > 0) {
    query = query.in("status", params.status);
  }
  if (params.source) query = query.eq("source", params.source);

  if (params.search) {
    const term = `%${params.search}%`;
    query = query.or(
      `name.ilike.${term},email.ilike.${term},company.ilike.${term}`
    );
  }

  const { data, count, error } = await query;
  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: { leads: data, total: count ?? 0 } };
}

/** Normalize empty strings to null for fields used in unique constraints */
function emptyToNull(val: unknown): string | null {
  if (typeof val === "string" && val.trim() !== "") return val;
  return null;
}

export async function createRawLead(
  body: Record<string, unknown>
): Promise<HandlerResult> {
  const db = createServerClient();
  const { source, source_url, name, email, title, company, raw_data, found_via } =
    body;
  const sourceId = emptyToNull(body.source_id);

  if (!source || typeof source !== "string") {
    return { status: 400, body: { error: "source is required" } };
  }

  // Cascade dedup: source+source_id → name+company → email
  const existing = await findExistingRawLead(db, {
    source,
    source_id: sourceId,
    name: name as string | undefined,
    company: company as string | undefined,
    email: email as string | undefined,
  });

  if (existing) {
    const result = await upsertExisting(db, existing, {
      source_id: sourceId, source_url, name, email, title, company, raw_data, found_via,
    });
    if ("error" in result) return { status: 500, body: { error: result.error } };
    return {
      status: 200,
      body: { ...result.row, existed: true, updated: result.updated },
    };
  }

  const { data, error } = await db
    .from("raw_leads")
    .insert({
      source,
      source_id: sourceId,
      source_url: emptyToNull(source_url),
      name: emptyToNull(name),
      email: emptyToNull(email),
      title: emptyToNull(title),
      company: emptyToNull(company),
      raw_data: raw_data ?? {},
      found_via: emptyToNull(found_via),
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation as 409 instead of 500
    if (error.code === "23505") {
      return { status: 409, body: { error: "Duplicate raw lead", detail: error.message } };
    }
    return { status: 500, body: { error: error.message } };
  }
  return { status: 201, body: { ...data, existed: false } };
}

export async function batchCreateRawLeads(
  body: Record<string, unknown>
): Promise<HandlerResult> {
  const db = createServerClient();
  const leads = body.leads;

  if (!Array.isArray(leads) || leads.length === 0) {
    return {
      status: 400,
      body: { error: "leads array is required and must not be empty" },
    };
  }

  for (const lead of leads) {
    if (!lead.source || typeof lead.source !== "string") {
      return { status: 400, body: { error: "Each lead must have a source" } };
    }
  }

  const results: (Record<string, unknown> & { _index: number })[] = [];
  let created = 0;
  let skipped = 0;
  let updated = 0;
  const toInsert: Record<string, unknown>[] = [];
  const insertIndices: number[] = [];

  // Per-lead cascade dedup + upsert
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const sourceId = emptyToNull(lead.source_id);
    const existing = await findExistingRawLead(db, {
      source: lead.source,
      source_id: sourceId,
      name: lead.name,
      company: lead.company,
      email: lead.email,
    });

    if (existing) {
      const result = await upsertExisting(db, existing, { ...lead, source_id: sourceId });
      if ("error" in result) return { status: 500, body: { error: result.error } };
      results.push({ ...result.row, existed: true, updated: result.updated, _index: i });
      if (result.updated) updated++;
      else skipped++;
    } else {
      toInsert.push({
        source: lead.source,
        source_id: sourceId,
        source_url: emptyToNull(lead.source_url),
        name: emptyToNull(lead.name),
        email: emptyToNull(lead.email),
        title: emptyToNull(lead.title),
        company: emptyToNull(lead.company),
        raw_data: lead.raw_data ?? {},
        found_via: emptyToNull(lead.found_via),
      });
      insertIndices.push(i);
    }
  }

  if (toInsert.length > 0) {
    const { data: inserted, error } = await db
      .from("raw_leads")
      .insert(toInsert)
      .select();

    if (error) {
      if (error.code === "23505") {
        return { status: 409, body: { error: "Duplicate raw lead in batch", detail: error.message } };
      }
      return { status: 500, body: { error: error.message } };
    }

    if (inserted) {
      for (let j = 0; j < inserted.length; j++) {
        results.push({ ...inserted[j], existed: false, _index: insertIndices[j] });
        created++;
      }
    }
  }

  // Sort by original order and strip _index
  results.sort((a, b) => a._index - b._index);
  const cleanResults = results.map(({ _index, ...rest }) => rest);

  return { status: 200, body: { created, skipped, updated, leads: cleanResults } };
}

export async function checkRawLead(
  source: string,
  sourceId: string
): Promise<HandlerResult> {
  if (!source || !sourceId) {
    return {
      status: 400,
      body: { error: "source and source_id query params are required" },
    };
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("raw_leads")
    .select("id, status")
    .eq("source", source)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (error) return { status: 500, body: { error: error.message } };
  if (data) {
    return { status: 200, body: { exists: true, id: data.id, status: data.status } };
  }
  return { status: 200, body: { exists: false } };
}

export async function updateRawLead(
  id: string,
  body: Record<string, unknown>
): Promise<HandlerResult> {
  const db = createServerClient();
  const updates: Record<string, unknown> = {};

  if ("status" in body) {
    if (!VALID_STATUSES.includes(body.status as string)) {
      return {
        status: 400,
        body: { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      };
    }
    updates.status = body.status;
  }
  if ("rejection_reason" in body) updates.rejection_reason = body.rejection_reason;
  if ("promoted_to_contact_id" in body)
    updates.promoted_to_contact_id = body.promoted_to_contact_id;

  if (Object.keys(updates).length === 0) {
    return { status: 400, body: { error: "No valid fields to update" } };
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("raw_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { status: 404, body: { error: "Raw lead not found" } };
    }
    return { status: 500, body: { error: error.message } };
  }
  return { status: 200, body: data };
}

/**
 * Name parsing for promote: splits full name into first_name / last_name.
 * - "John Smith" → { first_name: "John", last_name: "Smith" }
 * - "John Michael Smith" → { first_name: "John", last_name: "Michael Smith" }
 * - "John" → { first_name: "John", last_name: "Unknown" }
 * - null / empty → { first_name: "Unknown", last_name: "Unknown" }
 */
function parseName(name: string | null | undefined): {
  first_name: string;
  last_name: string;
} {
  if (!name || !name.trim()) {
    return { first_name: "Unknown", last_name: "Unknown" };
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "Unknown" };
  }
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

const ZOOMINFO_COLUMNS = [
  "zoominfo_contact_id",
  "profile_url",
  "direct_email",
  "direct_phone",
  "mobile_phone",
  "work_phone",
  "title",
  "seniority",
  "company_name",
  "company_industry",
  "company_size",
  "company_location",
  "employment_history",
  "intent_signals",
  "technographics",
  "verification_status",
  "raw_data",
] as const;

export async function promoteRawLead(
  id: string,
  opts?: {
    platformData?: Record<string, unknown>;
    research?: { summary?: string; research_data?: Record<string, unknown> };
  }
): Promise<HandlerResult> {
  const db = createServerClient();

  try {
    // 1. Fetch raw lead
    const { data: rawLead, error: fetchErr } = await db
      .from("raw_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) return { status: 500, body: { error: fetchErr.message } };
    if (!rawLead) return { status: 404, body: { error: "Raw lead not found" } };

    if (rawLead.status !== "pending") {
      return {
        status: 409,
        body: {
          error: `Raw lead status is '${rawLead.status}', must be 'pending' to promote`,
        },
      };
    }

    // 2. Parse name, prepare contact fields
    const { first_name, last_name } = parseName(rawLead.name);
    const email: string | null = rawLead.email || null;
    const title: string | null = rawLead.title || null;
    const company: string | null = rawLead.company || null;

    // 3. Dedup: case-insensitive email match
    let contact;
    if (email) {
      const { data: existing } = await db
        .from("contacts")
        .select("*")
        .ilike("email", email)
        .maybeSingle();
      if (existing) contact = existing;
    }

    // Extract social URLs from research data for the contact record
    let linkedinUrl: string | null = null;
    let instagramUrl: string | null = null;
    const rd = opts?.research?.research_data;
    if (rd) {
      const hyd = rd.hydration as Record<string, unknown> | undefined;
      const ci = hyd?.contact_info as Record<string, unknown> | undefined;
      const li = ci?.linkedin as Record<string, unknown> | undefined;
      if (typeof li?.value === "string") linkedinUrl = li.value;
      const social = ci?.social as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(social)) {
        const ig = social.find((s) => s.platform === "instagram");
        if (ig) {
          const handle = typeof ig.handle === "string" ? ig.handle : null;
          const url = typeof ig.url === "string" ? ig.url : null;
          instagramUrl = url || (handle && !handle.startsWith("http") ? `https://instagram.com/${handle.replace(/^@/, "")}` : handle) || null;
        }
      }
    }

    if (!contact) {
      // Promoted contacts start as "researched" — they've been hydrated before promotion
      const { data: newContact, error: insertErr } = await db
        .from("contacts")
        .insert({
          first_name, last_name, email, title, company, status: "researched",
          linkedin_url: linkedinUrl, instagram_url: instagramUrl,
        })
        .select()
        .single();
      if (insertErr) return { status: 500, body: { error: insertErr.message } };
      contact = newContact;
    } else {
      // Backfill social URLs on existing contact if missing
      const backfill: Record<string, unknown> = {};
      if (linkedinUrl && !contact.linkedin_url) backfill.linkedin_url = linkedinUrl;
      if (instagramUrl && !contact.instagram_url) backfill.instagram_url = instagramUrl;
      if (Object.keys(backfill).length > 0) {
        const { data: updated } = await db
          .from("contacts")
          .update(backfill)
          .eq("id", contact.id)
          .select()
          .single();
        if (updated) contact = updated;
      }
    }

    // 4. Create zoominfo_leads row
    const pd = opts?.platformData || {};
    const ziRow: Record<string, unknown> = { contact_id: contact.id };
    for (const col of ZOOMINFO_COLUMNS) {
      ziRow[col] = pd[col] ?? null;
    }

    const { data: zoomInfoLead, error: ziErr } = await db
      .from("zoominfo_leads")
      .insert(ziRow)
      .select()
      .single();
    if (ziErr) return { status: 500, body: { error: ziErr.message } };

    // 5. Store research if provided
    let research = null;
    if (opts?.research?.research_data) {
      const now = new Date().toISOString();
      const { data: researchRow, error: resErr } = await db
        .from("contact_research")
        .upsert(
          {
            contact_id: contact.id,
            summary: opts.research.summary ?? null,
            research_data: opts.research.research_data,
            researched_at: now,
          },
          { onConflict: "contact_id" }
        )
        .select()
        .single();
      if (resErr) return { status: 500, body: { error: resErr.message } };
      research = researchRow;
    }

    // 6. Update raw_lead → qualified
    const { data: updatedRawLead, error: updateErr } = await db
      .from("raw_leads")
      .update({
        status: "qualified",
        promoted_to_contact_id: contact.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (updateErr) return { status: 500, body: { error: updateErr.message } };

    return {
      status: 200,
      body: {
        contact,
        zoominfo_lead: zoomInfoLead,
        research,
        raw_lead: updatedRawLead,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 500, body: { error: `Promote failed: ${msg}` } };
  }
}
