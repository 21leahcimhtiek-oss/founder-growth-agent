/**
 * Merge.dev Unified API Service
 * 
 * Provides CRM data enrichment for outreach strategies.
 * Supports: HubSpot, Salesforce, Pipedrive, Zoho, Close, Copper, etc.
 */

const MERGE_API_KEY = process.env.MERGE_API_KEY || "";
const MERGE_BASE_URL = "https://api.merge.dev/api/crm/v1";

function getHeaders(accountToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${MERGE_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (accountToken) {
    headers["X-Account-Token"] = accountToken;
  }
  return headers;
}

// ─── Link Token (for connecting a CRM via Merge Link UI) ───

export async function createLinkToken(endUserEmail: string, endUserOrgName: string) {
  const res = await fetch("https://api.merge.dev/api/crm/v1/link-token", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      end_user_origin_id: endUserEmail,
      end_user_organization_name: endUserOrgName,
      end_user_email_address: endUserEmail,
      categories: ["crm"],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `Merge Link Token error: ${res.status}`);
  }

  return res.json();
}

// ─── Linked Accounts ───

export async function getLinkedAccounts() {
  const res = await fetch(`${MERGE_BASE_URL}/linked-accounts`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `Merge error: ${res.status}`);
  }

  return res.json();
}

// ─── Contacts ───

export interface MergeContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: Array<{ email_address: string; email_address_type: string }>;
  phone_numbers: Array<{ phone_number: string; phone_number_type: string }>;
  company: string | null;
  last_activity_at: string | null;
  remote_created_at: string | null;
}

export async function getContacts(
  accountToken: string,
  params?: { page_size?: number; cursor?: string; email?: string }
): Promise<{ next: string | null; previous: string | null; results: MergeContact[] }> {
  const query = new URLSearchParams();
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.email) query.set("email_addresses", params.email);

  const res = await fetch(`${MERGE_BASE_URL}/contacts?${query}`, {
    headers: getHeaders(accountToken),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `Merge contacts error: ${res.status}`);
  }

  return res.json();
}

// ─── Leads ───

export interface MergeLead {
  id: string;
  owner: string | null;
  lead_source: string | null;
  title: string | null;
  company: string | null;
  first_name: string | null;
  last_name: string | null;
  email_addresses: Array<{ email_address: string; email_address_type: string }>;
  phone_numbers: Array<{ phone_number: string; phone_number_type: string }>;
  converted_date: string | null;
  converted_contact: string | null;
  converted_account: string | null;
}

export async function getLeads(
  accountToken: string,
  params?: { page_size?: number; cursor?: string }
): Promise<{ next: string | null; previous: string | null; results: MergeLead[] }> {
  const query = new URLSearchParams();
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.cursor) query.set("cursor", params.cursor);

  const res = await fetch(`${MERGE_BASE_URL}/leads?${query}`, {
    headers: getHeaders(accountToken),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `Merge leads error: ${res.status}`);
  }

  return res.json();
}

// ─── Opportunities (Deals) ───

export interface MergeOpportunity {
  id: string;
  name: string | null;
  description: string | null;
  amount: number | null;
  owner: string | null;
  stage: string | null;
  status: string | null;
  close_date: string | null;
  last_activity_at: string | null;
}

export async function getOpportunities(
  accountToken: string,
  params?: { page_size?: number; cursor?: string; status?: string }
): Promise<{ next: string | null; previous: string | null; results: MergeOpportunity[] }> {
  const query = new URLSearchParams();
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.status) query.set("status", params.status);

  const res = await fetch(`${MERGE_BASE_URL}/opportunities?${query}`, {
    headers: getHeaders(accountToken),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `Merge opportunities error: ${res.status}`);
  }

  return res.json();
}

// ─── Accounts (Companies) ───

export interface MergeAccount {
  id: string;
  name: string | null;
  description: string | null;
  industry: string | null;
  website: string | null;
  number_of_employees: number | null;
  last_activity_at: string | null;
}

export async function getAccounts(
  accountToken: string,
  params?: { page_size?: number; cursor?: string }
): Promise<{ next: string | null; previous: string | null; results: MergeAccount[] }> {
  const query = new URLSearchParams();
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.cursor) query.set("cursor", params.cursor);

  const res = await fetch(`${MERGE_BASE_URL}/accounts?${query}`, {
    headers: getHeaders(accountToken),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `Merge accounts error: ${res.status}`);
  }

  return res.json();
}

// ─── CRM Summary (for agent context injection) ───

export async function getCRMSummary(accountToken: string): Promise<string> {
  try {
    const [contacts, leads, opportunities] = await Promise.all([
      getContacts(accountToken, { page_size: 10 }),
      getLeads(accountToken, { page_size: 10 }),
      getOpportunities(accountToken, { page_size: 10 }),
    ]);

    let summary = "## CRM Data Summary\n\n";

    // Contacts
    summary += `### Recent Contacts (${contacts.results.length})\n`;
    for (const c of contacts.results) {
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown";
      const email = c.email_addresses?.[0]?.email_address || "no email";
      const company = c.company || "no company";
      summary += `- **${name}** — ${email} — ${company}\n`;
    }

    // Leads
    summary += `\n### Recent Leads (${leads.results.length})\n`;
    for (const l of leads.results) {
      const name = [l.first_name, l.last_name].filter(Boolean).join(" ") || "Unknown";
      const source = l.lead_source || "unknown source";
      const company = l.company || "no company";
      summary += `- **${name}** — ${company} — source: ${source}\n`;
    }

    // Opportunities
    summary += `\n### Open Deals (${opportunities.results.length})\n`;
    for (const o of opportunities.results) {
      const name = o.name || "Unnamed";
      const amount = o.amount ? `$${o.amount.toLocaleString()}` : "no amount";
      const stage = o.stage || "unknown stage";
      summary += `- **${name}** — ${amount} — ${stage}\n`;
    }

    return summary;
  } catch (err) {
    return `CRM data unavailable: ${err instanceof Error ? err.message : "unknown error"}`;
  }
}