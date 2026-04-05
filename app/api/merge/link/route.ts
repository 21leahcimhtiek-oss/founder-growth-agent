import { NextRequest } from "next/server";
import { createLinkToken, getLinkedAccounts } from "@/lib/merge";

export const runtime = "nodejs";

// GET — list linked CRM accounts
export async function GET() {
  try {
    const data = await getLinkedAccounts();
    return Response.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST — generate a Merge Link token for connecting a CRM
export async function POST(req: NextRequest) {
  const { email, orgName } = await req.json();

  if (!email || !orgName) {
    return Response.json(
      { error: "email and orgName are required" },
      { status: 400 }
    );
  }

  try {
    const data = await createLinkToken(email, orgName);
    return Response.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}