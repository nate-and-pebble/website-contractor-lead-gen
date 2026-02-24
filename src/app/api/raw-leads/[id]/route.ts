import { NextRequest, NextResponse } from "next/server";
import { updateRawLead } from "@/api/handlers/raw-leads";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const result = await updateRawLead(id, body);
  return NextResponse.json(result.body, { status: result.status });
}
