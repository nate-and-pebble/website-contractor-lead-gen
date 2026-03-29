import { NextResponse } from "next/server";
import { listCronDocs } from "@/api/handlers/cron-docs";

export async function GET() {
  const result = await listCronDocs();
  return NextResponse.json(result.body, { status: result.status });
}
