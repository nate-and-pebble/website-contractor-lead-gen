import { createServerClient } from "@/db/client";
import { HandlerResult } from "@/lib/types";

const VALID_STATUSES = ["new", "researched", "ready", "booked", "dead"];
const VALID_SORT_COLUMNS = [
  "first_name", "last_name", "email", "company",
  "status", "disposition", "quality_score", "created_at", "updated_at",
];

export async function listContacts(params: {
  status?: string[];
  search?: string;
  has_research?: boolean;
  disposition?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
  offset?: number;
}): Promise<HandlerResult> {
  const db = createServerClient();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 5000);
  const offset = Math.max(params.offset ?? 0, 0);

  const sortBy = VALID_SORT_COLUMNS.includes(params.sort_by ?? "")
    ? params.sort_by!
    : "created_at";
  const ascending = params.sort_dir === "asc";

  // Join with contact_research to get has-research info + summary
  const selectClause = params.has_research === true
    ? "*, contact_research!inner(id, summary)"
    : "*, contact_research(id, summary)";

  let query = db
    .from("contacts")
    .select(selectClause, { count: "exact" })
    .order(sortBy, { ascending })
    .range(offset, offset + limit - 1);

  if (params.status && params.status.length > 0) {
    query = query.in("status", params.status);
  }

  if (params.disposition === "none") {
    query = query.is("disposition", null);
  } else if (params.disposition) {
    query = query.eq("disposition", params.disposition);
  }

  if (params.search) {
    const term = `%${params.search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},company.ilike.${term}`
    );
  }

  const { data, count, error } = await query;
  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: { contacts: data, total: count ?? 0 } };
}

export async function getContact(id: string): Promise<HandlerResult> {
  const db = createServerClient();

  const { data: contact, error } = await db
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { status: 500, body: { error: error.message } };
  if (!contact) return { status: 404, body: { error: "Contact not found" } };

  const [zoomResult, researchResult] = await Promise.all([
    db.from("zoominfo_leads").select("*").eq("contact_id", id).maybeSingle(),
    db.from("contact_research").select("*").eq("contact_id", id).maybeSingle(),
  ]);

  return {
    status: 200,
    body: {
      ...contact,
      zoominfo_lead: zoomResult.data ?? null,
      research: researchResult.data ?? null,
    },
  };
}

export async function createContact(
  body: Record<string, unknown>
): Promise<HandlerResult> {
  const db = createServerClient();
  const { first_name, last_name, email, phone, title, company } = body;

  if (!first_name || typeof first_name !== "string") {
    return { status: 400, body: { error: "first_name is required" } };
  }
  if (!last_name || typeof last_name !== "string") {
    return { status: 400, body: { error: "last_name is required" } };
  }

  // Dedup: case-insensitive email match
  if (email && typeof email === "string") {
    const { data: existing } = await db
      .from("contacts")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      return { status: 200, body: { ...existing, existed: true } };
    }
  }

  const { data, error } = await db
    .from("contacts")
    .insert({
      first_name,
      last_name,
      email: (email as string) ?? null,
      phone: (phone as string) ?? null,
      title: (title as string) ?? null,
      company: (company as string) ?? null,
    })
    .select()
    .single();

  if (error) return { status: 500, body: { error: error.message } };
  return { status: 201, body: { ...data, existed: false } };
}

export async function updateContact(
  id: string,
  body: Record<string, unknown>
): Promise<HandlerResult> {
  const db = createServerClient();
  const allowed = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "title",
    "company",
    "linkedin_url",
    "instagram_url",
    "status",
    "disposition",
    "quality_score",
    "notes",
    "follow_up_at",
    "ball_in_court",
    "ball_in_court_note",
  ];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if ("status" in updates) {
    if (!VALID_STATUSES.includes(updates.status as string)) {
      return {
        status: 400,
        body: { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      };
    }
  }

  if ("disposition" in updates) {
    const val = updates.disposition;
    if (val !== null && val !== "campaign" && val !== "call") {
      return {
        status: 400,
        body: { error: "disposition must be null, 'campaign', or 'call'" },
      };
    }
  }

  if ("ball_in_court" in updates) {
    const val = updates.ball_in_court;
    if (val !== null && val !== "mine" && val !== "theirs" && val !== "scheduled") {
      return {
        status: 400,
        body: { error: "ball_in_court must be null, 'mine', 'theirs', or 'scheduled'" },
      };
    }
  }

  if (Object.keys(updates).length === 0) {
    return { status: 400, body: { error: "No valid fields to update" } };
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { status: 404, body: { error: "Contact not found" } };
    }
    return { status: 500, body: { error: error.message } };
  }
  return { status: 200, body: data };
}

/**
 * Backfill contact info from research hydration data.
 *
 * For contacts missing email/phone/linkedin_url/instagram_url on the contact
 * record, check if the data exists in contact_research.research_data.hydration
 * and copy it to the contact columns so future loads are instant.
 */
export async function backfillContactInfo(
  body: Record<string, unknown>
): Promise<HandlerResult> {
  const db = createServerClient();
  const contactIds = body.contact_ids;

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return { status: 400, body: { error: "contact_ids array is required" } };
  }

  // Cap at 100 to prevent abuse
  const ids = contactIds.slice(0, 100) as string[];

  // Fetch research data for these contacts
  const { data: researchRows, error } = await db
    .from("contact_research")
    .select("contact_id, research_data")
    .in("contact_id", ids);

  if (error) return { status: 500, body: { error: error.message } };
  if (!researchRows || researchRows.length === 0) {
    return { status: 200, body: { updates: {} } };
  }

  // Fetch current contact fields so we only backfill nulls
  const { data: contacts, error: contactsErr } = await db
    .from("contacts")
    .select("id, email, phone, linkedin_url, instagram_url")
    .in("id", ids);

  if (contactsErr) return { status: 500, body: { error: contactsErr.message } };

  const contactMap = new Map(
    (contacts ?? []).map((c: Record<string, unknown>) => [c.id as string, c])
  );

  const updates: Record<string, Record<string, string>> = {};

  for (const row of researchRows) {
    const rd = row.research_data as Record<string, unknown> | null;
    if (!rd) continue;

    const hydration = rd.hydration as Record<string, unknown> | undefined;
    const contactInfo = hydration?.contact_info as Record<string, unknown> | undefined;
    if (!contactInfo) continue;

    const existing = contactMap.get(row.contact_id as string);
    if (!existing) continue;

    const patch: Record<string, string> = {};

    // Email
    if (!existing.email) {
      const emailObj = contactInfo.email as Record<string, unknown> | undefined;
      const emailVal = typeof emailObj?.value === "string" ? emailObj.value : null;
      if (emailVal) patch.email = emailVal;
    }

    // Phone
    if (!existing.phone) {
      const phoneObj = contactInfo.phone as Record<string, unknown> | undefined;
      const phoneVal = typeof phoneObj?.value === "string" ? phoneObj.value : null;
      if (phoneVal) patch.phone = phoneVal;
    }

    // LinkedIn
    if (!existing.linkedin_url) {
      const linkedinObj = contactInfo.linkedin as Record<string, unknown> | undefined;
      const linkedinVal = typeof linkedinObj?.value === "string" ? linkedinObj.value : null;
      if (linkedinVal) patch.linkedin_url = linkedinVal;
    }

    // Instagram
    if (!existing.instagram_url) {
      const social = contactInfo.social as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(social)) {
        const ig = social.find((s) => s.platform === "instagram");
        if (ig) {
          const url = typeof ig.url === "string" ? ig.url : null;
          const handle = typeof ig.handle === "string" ? ig.handle : null;
          const igVal = url || (handle ? (handle.startsWith("http") ? handle : `https://instagram.com/${handle.replace(/^@/, "")}`) : null);
          if (igVal) patch.instagram_url = igVal;
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      updates[row.contact_id as string] = patch;
    }
  }

  // Write patches back to contacts table
  const writePromises = Object.entries(updates).map(([id, patch]) =>
    db.from("contacts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id)
  );
  await Promise.all(writePromises);

  return { status: 200, body: { updates } };
}
