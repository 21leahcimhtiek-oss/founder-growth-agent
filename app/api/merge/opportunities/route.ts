import { NextRequest } from "next/server";
import { getOpportunities } from "@/lib/merge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const accountToken = req.headers.get("x-account-token");
  if (!accountToken) {
    return Response.json({ error: "x-account-token header required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page_size = Number(searchParams.get("page_size")) || 20;
  const cursor = searchParams.get("cursor") || undefined;
  const status = searchParams.get("status") || undefined;

  try {
    const data = await getOpportunities(accountToken, { page_size, cursor, status });
    return Response.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}