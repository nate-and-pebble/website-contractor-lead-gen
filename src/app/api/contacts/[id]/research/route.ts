import { NextRequest, NextResponse } from "next/server";
import { getResearch, upsertResearch } from "@/api/handlers/research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getResearch(id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const result = await upsertResearch(id, body);
  return NextResponse.json(result.body, { status: result.status });
}
