import type { Contact, RawLead, ZoominfoLead, ContactResearch, CallLog } from "./types";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status);
  }

  return res.json();
}

// ---- Stats ----

export interface StatsResponse {
  raw_leads: { pending: number; qualified: number; rejected: number; total: number };
  contacts: { new: number; researched: number; ready: number; booked: number; dead: number; total: number };
}

export function fetchStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>("/api/stats");
}

// ---- Contacts ----

export interface ContactsParams {
  status?: string[];
  search?: string;
  has_research?: boolean;
  disposition?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ContactListItem extends Contact {
  contact_research: Array<{ id: string; summary: string | null }>;
}

export interface ContactsResponse {
  contacts: ContactListItem[];
  total: number;
}

export function fetchContacts(params: ContactsParams = {}): Promise<ContactsResponse> {
  const sp = new URLSearchParams();
  params.status?.forEach((s) => sp.append("status", s));
  if (params.search) sp.set("search", params.search);
  if (params.has_research !== undefined) sp.set("has_research", String(params.has_research));
  if (params.disposition) sp.set("disposition", params.disposition);
  if (params.sort_by) sp.set("sort_by", params.sort_by);
  if (params.sort_dir) sp.set("sort_dir", params.sort_dir);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return apiFetch<ContactsResponse>(`/api/contacts${qs ? `?${qs}` : ""}`);
}

// ---- Contact Detail ----

export interface ContactDetail extends Contact {
  zoominfo_lead: ZoominfoLead | null;
  research: ContactResearch | null;
}

export function fetchContact(id: string): Promise<ContactDetail> {
  return apiFetch<ContactDetail>(`/api/contacts/${id}`);
}

export function patchContact(id: string, data: Record<string, unknown>): Promise<Contact> {
  return apiFetch<Contact>(`/api/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface BackfillResult {
  updates: Record<string, Record<string, string>>;
}

export function backfillContactInfo(contactIds: string[]): Promise<BackfillResult> {
  return apiFetch<BackfillResult>("/api/contacts/backfill-info", {
    method: "POST",
    body: JSON.stringify({ contact_ids: contactIds }),
  });
}

// ---- Call Logs ----

export interface CallLogsResponse {
  logs: CallLog[];
}

export function fetchCallLogs(contactId: string): Promise<CallLogsResponse> {
  return apiFetch<CallLogsResponse>(`/api/contacts/${contactId}/calls`);
}

export function createCallLog(
  contactId: string,
  data: { outcome: string; notes?: string }
): Promise<CallLog> {
  return apiFetch<CallLog>(`/api/contacts/${contactId}/calls`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- Raw Leads ----

export interface RawLeadsParams {
  status?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RawLeadsResponse {
  leads: RawLead[];
  total: number;
}

export function fetchRawLeads(params: RawLeadsParams = {}): Promise<RawLeadsResponse> {
  const sp = new URLSearchParams();
  params.status?.forEach((s) => sp.append("status", s));
  if (params.search) sp.set("search", params.search);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return apiFetch<RawLeadsResponse>(`/api/raw-leads${qs ? `?${qs}` : ""}`);
}

export function patchRawLead(id: string, data: Record<string, unknown>): Promise<RawLead> {
  return apiFetch<RawLead>(`/api/raw-leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
