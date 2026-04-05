import { NextRequest } from "next/server";
import { getCRMSummary } from "@/lib/merge";

export const runtime = "nodejs";

// GET — returns a markdown summary of CRM data for agent context injection
export async function GET(req: NextRequest) {
  const accountToken = req.headers.get("x-account-token");
  if (!accountToken) {
    return Response.json({ error: "x-account-token header required" }, { status: 400 });
  }

  try {
    const summary = await getCRMSummary(accountToken);
    return Response.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}