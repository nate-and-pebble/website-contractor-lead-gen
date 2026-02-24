import { NextRequest, NextResponse } from "next/server";
import { checkRawLead } from "@/api/handlers/raw-leads";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = await checkRawLead(
    sp.get("source") ?? "",
    sp.get("source_id") ?? ""
  );
  return NextResponse.json(result.body, { status: result.status });
}
