import { NextResponse } from "next/server";
import { getStats } from "@/api/handlers/stats";

export async function GET() {
  const result = await getStats();
  return NextResponse.json(result.body, { status: result.status });
}
