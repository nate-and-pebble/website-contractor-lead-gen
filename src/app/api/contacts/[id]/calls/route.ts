import { NextRequest, NextResponse } from "next/server";
import { listCallLogs, createCallLog } from "@/api/handlers/call-log";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await listCallLogs(id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const result = await createCallLog(id, body);
  return NextResponse.json(result.body, { status: result.status });
}
