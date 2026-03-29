import { NextRequest, NextResponse } from "next/server";
import { getCronDoc, updateCronDoc } from "@/api/handlers/cron-docs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const result = await getCronDoc(key);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await req.json();
  const result = await updateCronDoc(key, body);
  return NextResponse.json(result.body, { status: result.status });
}
