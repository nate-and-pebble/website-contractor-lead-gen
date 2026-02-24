# Provider Lead Engine — Architecture

## Overview

Provider Lead Engine is a web application for finding and connecting with providers. It uses a layered architecture with four distinct layers: API, Frontend, Database, and CLI. All business logic flows through the API layer, which serves as the single source of truth.

## Directory Structure

```
provider-lead-engine/
├── bin/
│   └── ple.js                   # CLI binary entry point
│
├── cli/                         # CLI Layer
│   ├── index.ts                 # Entry point — registers commands, parses args
│   ├── commands/
│   │   ├── auth.ts              # auth login | status | logout
│   │   ├── db.ts                # db migrate | status
│   │   └── server.ts            # dev | build
│   └── lib/
│       ├── api-client.ts        # HTTP client for calling the API
│       ├── config.ts            # CLI config file (~/.ple/config.json)
│       └── output.ts            # Terminal output formatting
│
├── src/
│   ├── api/                     # API Layer — core business logic
│   │   └── handlers/
│   │       └── auth.ts          # Auth: PIN validation, rate limiting, sessions
│   │
│   ├── db/                      # Database Layer
│   │   ├── client.ts            # Supabase client (browser + server)
│   │   ├── models/              # Typed data access functions
│   │   └── migrations/          # SQL migration scripts
│   │
│   ├── app/                     # Frontend Layer (Next.js App Router)
│   │   ├── api/                 # Next.js API routes (thin wrappers)
│   │   │   └── auth/
│   │   │       └── route.ts     # POST /api/auth
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   └── globals.css          # Global styles
│   │
│   ├── lib/                     # Shared utilities and types
│   │   ├── auth.ts              # HMAC session signing/verification
│   │   └── types.ts             # Shared TypeScript types (API shapes, handler contracts)
│   │
│   └── middleware.ts            # Next.js middleware (auth gate)
│
├── public/                      # Static assets
├── package.json
├── tsconfig.json                # TypeScript config (Next.js)
├── tsconfig.cli.json            # TypeScript config (CLI build)
├── next.config.ts
├── eslint.config.mjs
└── postcss.config.mjs
```

## Layers

### API Layer (`src/api/`)

The core of the application. All business logic lives here.

**Responsibilities:**
- Request validation and business rule enforcement
- Rate limiting and abuse prevention
- Orchestrating database queries via the DB layer
- Returning structured results (not HTTP responses)

**Rules:**
- Handlers are plain async functions — no framework imports (no `NextRequest`, no `NextResponse`)
- Handlers accept typed parameters and return typed result objects
- Handlers never set cookies, headers, or status codes directly — callers do that
- One file per domain (auth, leads, providers, etc.)

**Example handler signature:**
```ts
// src/api/handlers/auth.ts
import type { AuthResult } from "@/lib/types";

export async function authenticate(ip: string, pin: string): Promise<AuthResult>
```

**Adding a new API endpoint:**
1. Create or extend a handler in `src/api/handlers/`
2. Create a Next.js route in `src/app/api/` that calls the handler
3. Map the handler result to a `NextResponse` (status, cookies, headers)

### Frontend Layer (`src/app/`)

Next.js App Router — pages, layouts, and thin API route wrappers.

**Responsibilities:**
- Rendering pages and UI components
- Client-side interactivity and state
- API routes: parsing HTTP requests, calling handlers, building HTTP responses

**Rules:**
- API routes (`src/app/api/`) are thin wrappers — extract params from the request, call a handler, return the response. No business logic.
- Pages go in `src/app/<route>/page.tsx`
- Client components use `"use client"` directive
- Shared UI components go in `src/app/components/` (create as needed)

**API route pattern:**
```ts
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { myHandler } from "@/api/handlers/example";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await myHandler(body.field);

  return NextResponse.json(result.body, { status: result.status });
}
```

### Database Layer (`src/db/`)

Data access, connection management, and schema.

**Responsibilities:**
- Supabase client initialization (browser + server)
- Typed model functions for data access (queries, inserts, updates)
- Migration scripts for schema changes

**Rules:**
- `client.ts` exports two clients: `supabase` (browser, public key) and `createServerClient()` (server, secret key)
- Model files go in `src/db/models/` — one file per table/domain
- Models export typed async functions, not raw query builders
- Migrations go in `src/db/migrations/` as numbered SQL files (e.g., `001_create_leads.sql`)

**Model pattern:**
```ts
// src/db/models/leads.ts
import { createServerClient } from "@/db/client";

export interface Lead {
  id: string;
  name: string;
  created_at: string;
}

export async function getLeads(): Promise<Lead[]> {
  const db = createServerClient();
  const { data, error } = await db.from("leads").select("*");
  if (error) throw error;
  return data;
}
```

### CLI Layer (`cli/`)

A command-line interface that wraps the API over HTTP.

**Responsibilities:**
- Providing terminal access to all API functionality
- Managing local configuration and authentication state
- Convenience wrappers for development tasks (dev server, builds)

**Rules:**
- The CLI calls the API over HTTP — it never imports from `src/` directly
- Commands go in `cli/commands/` — one file per command group
- The API client (`cli/lib/api-client.ts`) handles all HTTP communication
- Config is stored at `~/.ple/config.json`
- All commands have descriptions and `--help` support via Commander

### Shared Utilities & Types (`src/lib/`)

Code shared across layers (API, frontend, middleware).

**Responsibilities:**
- Shared TypeScript types for API request/response shapes and handler contracts (`types.ts`)
- Framework-agnostic utility functions (`auth.ts`, etc.)

**Rules:**
- Small, focused utility modules
- No framework-specific code (no Next.js, no React)
- Importable from any layer via `@/lib/`
- Handler result types (e.g. `AuthResult`) and API body types live in `types.ts` — handlers and route wrappers both import from here to prevent drift
- DB models define Postgres row shapes; `types.ts` defines HTTP-layer shapes — keep them separate

**Types pattern:**
```ts
// src/lib/types.ts

// Handler → route wrapper contract
export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export interface AuthResult extends HandlerResult {
  sessionValue?: string;
}

// HTTP API request/response body shapes
export interface AuthRequest {
  pin: string;
}
```

**Adding types for a new endpoint:**
1. Add request/response body interfaces to `src/lib/types.ts`
2. Add a `HandlerResult` extension if the handler returns extra fields (cookies, headers, etc.)
3. Import the types in both the handler (`src/api/handlers/`) and route wrapper (`src/app/api/`)

## Data Flow

```
Frontend (browser)                CLI (terminal)
      |                                |
      v                                v
  Next.js API route              HTTP request
  (src/app/api/)              (cli/lib/api-client)
      |                                |
      +---------- both call ----------+
                     |
                     v
              API handlers
            (src/api/handlers/)
                     |
                     v
              Database models
              (src/db/models/)
                     |
                     v
               Supabase client
              (src/db/client.ts)
                     |
                     v
                 Supabase DB
```

**Request lifecycle (frontend):**
1. Browser sends request to `/api/auth`
2. Next.js middleware checks auth (for protected routes)
3. `src/app/api/auth/route.ts` parses the request
4. Calls `authenticate()` from `src/api/handlers/auth.ts`
5. Handler validates input, checks rate limits, queries DB if needed
6. Returns a typed result object
7. Route handler maps result to `NextResponse` (sets cookies, status)

**Request lifecycle (CLI):**
1. User runs `ple auth login`
2. Commander routes to `cli/commands/auth.ts`
3. Command prompts for PIN, calls `apiClient.post("/api/auth", { pin })`
4. Server processes identically to frontend flow
5. CLI stores session cookie in `~/.ple/config.json`

## CLI Usage Guide

### Running the CLI

```bash
# Via npm script (development)
npm run cli -- <command>

# Via bin entry (after npm link)
ple <command>
```

### Commands

#### `ple auth login`

Authenticate with the API using an access PIN.

```bash
$ ple auth login
Access PIN: ******
[ok] Authenticated successfully
```

Pass `--pin` to skip the interactive prompt (useful for scripts):

```bash
$ ple auth login --pin abc123
[ok] Authenticated successfully
```

#### `ple auth status`

Check whether you have a stored session.

```bash
$ ple auth status
[ok] Authenticated (session token stored)
```

#### `ple auth logout`

Clear stored credentials.

```bash
$ ple auth logout
[ok] Logged out
```

#### `ple db migrate`

Run all SQL migrations from `src/db/migrations/` against the database (requires `SUPABASE_DB_PASSWORD`).

```bash
$ ple db migrate
Found 1 migration(s):
  001_create_lead_tables.sql
Connected to database.
Running 001_create_lead_tables.sql...
[ok] 001_create_lead_tables.sql
[ok] All migrations applied.
```

Use `--dry-run` to preview SQL without executing:

```bash
$ ple db migrate --dry-run
```

#### `ple db status`

Test database connectivity.

```bash
$ ple db status
[ok] Connected to database
  Database: postgres
  Time:     2026-02-24T07:00:00.000Z
```

#### `ple dev`

Start the Next.js development server.

```bash
$ ple dev
$ ple dev --port 4000
```

#### `ple build`

Run the production build.

```bash
$ ple build
```

### Configuration

The CLI stores its config at `~/.ple/config.json`:

```json
{
  "apiUrl": "http://localhost:3000",
  "sessionToken": "leads_session=..."
}
```

Override the API URL with the `PLE_API_URL` environment variable:

```bash
PLE_API_URL=https://my-app.vercel.app ple auth status
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `api-client.ts` |
| Directories | kebab-case | `src/api/handlers/` |
| Functions | camelCase | `createServerClient()` |
| Types/Interfaces | PascalCase | `AuthResult` |
| Constants | UPPER_SNAKE_CASE | `MAX_AGE_SECONDS` |
| Env vars | UPPER_SNAKE_CASE | `LEADS_PIN` |
| React components | PascalCase | `LoginPage` |
| API routes | REST conventions | `POST /api/auth` |
| DB migrations | numbered prefix | `001_create_leads.sql` |
| CLI commands | kebab-case | `auth login` |

## Patterns

### Error handling

API handlers return error information in the result object — they do not throw. Route handlers map these to HTTP responses.

```ts
// Handler returns an error result
if (!pin) {
  return { status: 400, body: { error: "PIN required" } };
}

// Route handler maps it
const result = await authenticate(ip, body.pin);
return NextResponse.json(result.body, { status: result.status });
```

### Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Server | Supabase secret key |
| `SUPABASE_DB_PASSWORD` | Server | Supabase Postgres password (for direct DB via `pg`) |
| `LEADS_PIN` | Server | PIN for access control |
| `LEADS_SECRET` | Server | HMAC signing secret |
| `PLE_API_URL` | CLI | API base URL override |

> **Where to get secrets:** All credentials live in `~/openclaw-config/openclaw.json` under the `PROVIDER_LEAD_ENGINE_*` keys. Copy the values into your `.env.local` (which is gitignored). Never commit secrets to the repo.

### Import aliases

The `@/` alias maps to `src/`:

```ts
import { authenticate } from "@/api/handlers/auth";
import { createServerClient } from "@/db/client";
import { verifySessionValue } from "@/lib/auth";
```

CLI files use relative imports (no alias):

```ts
import { createApiClient } from "../lib/api-client";
```
