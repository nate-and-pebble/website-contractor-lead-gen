import { createServerClient } from "@/db/client";
import { HandlerResult } from "@/lib/types";
import { parseCronConfig, CronConfigError } from "@/lib/cron-config";

// ---------------------------------------------------------------------------
// GET /api/admin/cron-docs — list all keys + metadata
// ---------------------------------------------------------------------------
export async function listCronDocs(): Promise<HandlerResult> {
  const db = createServerClient();
  const { data, error } = await db
    .from("cron_documents")
    .select("key, updated_at, updated_by, version, enabled")
    .order("key");

  if (error) {
    return { status: 500, body: { error: error.message } };
  }
  return { status: 200, body: { documents: data } };
}

// ---------------------------------------------------------------------------
// GET /api/admin/cron-docs/[key] — fetch full markdown
// ---------------------------------------------------------------------------
export async function getCronDoc(key: string): Promise<HandlerResult> {
  const db = createServerClient();
  const { data, error } = await db
    .from("cron_documents")
    .select("*")
    .eq("key", key)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { status: 404, body: { error: `Document '${key}' not found` } };
    }
    return { status: 500, body: { error: error.message } };
  }
  return { status: 200, body: data };
}

// ---------------------------------------------------------------------------
// PUT /api/admin/cron-docs/[key] — update markdown (validates cron_config)
// ---------------------------------------------------------------------------
export async function updateCronDoc(
  key: string,
  body: { markdown: string; updated_by?: string }
): Promise<HandlerResult> {
  if (typeof body.markdown !== "string") {
    return { status: 400, body: { error: "markdown field is required" } };
  }

  // Validate cron_config block if present
  try {
    parseCronConfig(body.markdown);
  } catch (err) {
    if (err instanceof CronConfigError) {
      return { status: 422, body: { error: err.message } };
    }
    throw err;
  }

  const db = createServerClient();

  // Optimistic version bump
  const { data, error } = await db
    .from("cron_documents")
    .update({
      markdown: body.markdown,
      updated_by: body.updated_by ?? null,
    })
    .eq("key", key)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { status: 404, body: { error: `Document '${key}' not found` } };
    }
    return { status: 500, body: { error: error.message } };
  }

  // Increment version via a second call (Supabase JS doesn't support SET version = version + 1)
  await db
    .from("cron_documents")
    .update({ version: (data.version ?? 0) + 1 })
    .eq("key", key);

  return { status: 200, body: { ...data, version: (data.version ?? 0) + 1 } };
}
