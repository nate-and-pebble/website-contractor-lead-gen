import { NextRequest, NextResponse } from "next/server";
import { batchCreateRawLeads } from "@/api/handlers/raw-leads";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const result = await batchCreateRawLeads(body);
  return NextResponse.json(result.body, { status: result.status });
}
