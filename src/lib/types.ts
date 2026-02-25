// ---------------------------------------------------------------------------
// Shared types — API request/response shapes and handler contracts
//
// These types define the contract between layers:
//   - API handlers use HandlerResult / AuthResult as return types
//   - Route wrappers use them to build HTTP responses
//   - Request/response body types document the HTTP API contract
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Handler result types (handler → route wrapper contract)
// ---------------------------------------------------------------------------

/** Base result returned by API handlers to route wrappers. */
export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

/** Result from the auth handler. */
export interface AuthResult extends HandlerResult {
  /** Set as a cookie by the route handler when present. */
  sessionValue?: string;
}

// ---------------------------------------------------------------------------
// POST /api/auth
// ---------------------------------------------------------------------------

/** Request body for POST /api/auth */
export interface AuthRequest {
  pin: string;
}

/** Successful response from POST /api/auth */
export interface AuthSuccessBody {
  ok: true;
}

/** Error response from POST /api/auth */
export interface AuthErrorBody {
  error: string;
  cooldown?: number;
}

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

export interface RawLead {
  id: string;
  source: string;
  source_url: string | null;
  source_id: string | null;
  name: string | null;
  email: string | null;
  title: string | null;
  company: string | null;
  raw_data: Record<string, unknown>;
  found_via: string | null;
  status: string;
  rejection_reason: string | null;
  promoted_to_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: string | null;
  status: string;
  disposition: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  quality_score: number | null;
  notes: string | null;
  follow_up_at: string | null;
  ball_in_court: string | null;
  ball_in_court_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  contact_id: string;
  outcome: string;
  notes: string | null;
  created_at: string;
}

export interface ZoominfoLead {
  id: string;
  contact_id: string;
  zoominfo_contact_id: string | null;
  profile_url: string | null;
  direct_email: string | null;
  direct_phone: string | null;
  mobile_phone: string | null;
  work_phone: string | null;
  title: string | null;
  seniority: string | null;
  company_name: string | null;
  company_industry: string | null;
  company_size: string | null;
  company_location: string | null;
  employment_history: Record<string, unknown> | null;
  intent_signals: Record<string, unknown> | null;
  technographics: Record<string, unknown> | null;
  verification_status: string | null;
  raw_data: Record<string, unknown> | null;
  fetched_at: string;
  created_at: string;
}

export interface ContactResearch {
  id: string;
  contact_id: string;
  summary: string | null;
  research_data: Record<string, unknown>;
  researched_at: string;
  updated_at: string;
}
