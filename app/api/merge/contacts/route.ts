import { NextRequest } from "next/server";
import { getContacts } from "@/lib/merge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const accountToken = req.headers.get("x-account-token");
  if (!accountToken) {
    return Response.json({ error: "x-account-token header required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page_size = Number(searchParams.get("page_size")) || 20;
  const cursor = searchParams.get("cursor") || undefined;
  const email = searchParams.get("email") || undefined;

  try {
    const data = await getContacts(accountToken, { page_size, cursor, email });
    return Response.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}