import { NextRequest, NextResponse } from "next/server";
import { getContact, updateContact } from "@/api/handlers/contacts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getContact(id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const result = await updateContact(id, body);
  return NextResponse.json(result.body, { status: result.status });
}
