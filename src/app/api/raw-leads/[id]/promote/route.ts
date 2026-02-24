import { NextRequest, NextResponse } from "next/server";
import { promoteRawLead } from "@/api/handlers/raw-leads";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await promoteRawLead(id, body.platform_data);
  return NextResponse.json(result.body, { status: result.status });
}
