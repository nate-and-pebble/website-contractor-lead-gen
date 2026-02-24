import { NextRequest, NextResponse } from "next/server";
import { listContacts, createContact } from "@/api/handlers/contacts";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = await listContacts({
    status: sp.getAll("status").length > 0 ? sp.getAll("status") : undefined,
    search: sp.get("search") ?? undefined,
    has_research: sp.has("has_research") ? sp.get("has_research") === "true" : undefined,
    disposition: sp.get("disposition") ?? undefined,
    sort_by: sp.get("sort_by") ?? undefined,
    sort_dir: sp.get("sort_dir") ?? undefined,
    limit: sp.has("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.has("offset") ? Number(sp.get("offset")) : undefined,
  });
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const result = await createContact(body);
  return NextResponse.json(result.body, { status: result.status });
}
