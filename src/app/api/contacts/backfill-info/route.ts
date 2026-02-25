import { NextRequest, NextResponse } from "next/server";
import { backfillContactInfo } from "@/api/handlers/contacts";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const result = await backfillContactInfo(body);
  return NextResponse.json(result.body, { status: result.status });
}
