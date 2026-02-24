import { NextRequest, NextResponse } from "next/server";
import { listRawLeads, createRawLead } from "@/api/handlers/raw-leads";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = await listRawLeads({
    status: sp.getAll("status").length > 0 ? sp.getAll("status") : undefined,
    source: sp.get("source") ?? undefined,
    search: sp.get("search") ?? undefined,
    limit: sp.has("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.has("offset") ? Number(sp.get("offset")) : undefined,
  });
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const result = await createRawLead(body);
  return NextResponse.json(result.body, { status: result.status });
}
