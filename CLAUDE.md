# Provider Lead Engine

Sales pipeline tool for Rebecca ("Becks") to manage provider outreach — calls, email campaigns, and deal pipeline.

## Stack

Next.js 16 + React 19 + Tailwind v4 + Supabase (Postgres) + Commander CLI

## Project Structure

```
src/
  api/handlers/     # Business logic (pure functions, no framework imports)
  app/
    api/            # Next.js route wrappers (thin, call handlers)
    (dashboard)/    # Dashboard pages: /, /calls, /campaign, /pipeline
  db/
    client.ts       # Supabase client (browser + server)
    pg.ts           # Direct Postgres client (migrations)
    migrations/     # Numbered SQL files
  lib/
    types.ts        # Shared types (Contact, CallLog, etc.)
    api-client.ts   # Browser fetch wrapper for frontend
  components/       # Shared UI components
cli/
  index.ts          # `ple` CLI entry (dev tools: auth, db, server)
  sales-engine.ts   # `sales-engine` CLI entry (API client)
```

## Two CLIs

### `ple` — Dev Tools CLI

Run: `npm run cli -- <command>` or `npx tsx cli/index.ts <command>`

Config: `~/.ple/config.json` + `.env.local` (loaded via dotenv)

| Command | Description |
|---------|-------------|
| `ple auth login [--pin <pin>]` | Authenticate with API |
| `ple auth status` | Check stored session |
| `ple auth logout` | Clear credentials |
| `ple db migrate [--dry-run]` | Run SQL migrations |
| `ple db status` | Test DB connectivity |
| `ple dev [-p <port>]` | Start Next.js dev server |
| `ple build` | Production build |

### `sales-engine` — API Client CLI

Run: `npm run se -- <command>` or `npx tsx cli/sales-engine.ts <command>`

Config: env vars `SALES_ENGINE_API_URL` + `SALES_ENGINE_API_KEY`, or `~/.sales-engine/config.json`

All output is JSON to stdout. Errors go to stderr.

#### Contacts

| Command | Description |
|---------|-------------|
| `sales-engine contacts list [--status <s>...] [--search <text>] [--limit <n>] [--offset <n>]` | List contacts |
| `sales-engine contacts get <id>` | Get contact detail (includes zoominfo + research) |
| `sales-engine contacts create --first <name> --last <name> [--email] [--phone] [--title] [--company]` | Create contact (dedup on email) |
| `sales-engine contacts update <id> [--status <s>] [--email] [--phone] [--title] [--company] [--quality-score <n>] [--notes <text>]` | Update contact |

Valid statuses: `new`, `researched`, `ready`, `booked`, `dead`

#### Raw Leads

| Command | Description |
|---------|-------------|
| `sales-engine raw-leads list [--status <s>] [--source <s>] [--limit <n>] [--offset <n>]` | List raw leads |
| `sales-engine raw-leads create --source <s> [--source-id] [--name] [--email] [--title] [--company] [--raw-data <json>] [--found-via <text>]` | Create a raw lead (upsert on source+source_id) |
| `sales-engine raw-leads batch --file <path>` | Batch create from JSON file `{ "leads": [...] }` |
| `sales-engine raw-leads check --source <s> --source-id <id>` | Check if lead exists |
| `sales-engine raw-leads update <id> [--status <s>] [--rejection-reason <text>]` | Update raw lead |
| `sales-engine raw-leads promote <id> [--platform-data <json>] [--summary <text>] [--research-data <json>]` | Promote to contact (as "researched") with optional research |

Valid statuses: `pending`, `qualified`, `rejected`

#### Research

| Command | Description |
|---------|-------------|
| `sales-engine research get <contact_id>` | Get research for a contact |
| `sales-engine research update <contact_id> --summary <text> --research-data <json>` | Create/replace research |

#### Stats

| Command | Description |
|---------|-------------|
| `sales-engine stats` | Get pipeline summary counts |

## API Endpoints

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/auth` | `src/api/handlers/auth.ts` |
| GET/POST | `/api/contacts` | `src/api/handlers/contacts.ts` |
| GET/PATCH | `/api/contacts/[id]` | `src/api/handlers/contacts.ts` |
| GET/POST | `/api/contacts/[id]/calls` | `src/api/handlers/call-log.ts` |
| GET/PUT | `/api/contacts/[id]/research` | `src/api/handlers/research.ts` |
| GET/POST | `/api/raw-leads` | `src/api/handlers/raw-leads.ts` |
| PATCH | `/api/raw-leads/[id]` | `src/api/handlers/raw-leads.ts` |
| POST | `/api/raw-leads/[id]/promote` | `src/api/handlers/raw-leads.ts` |
| POST | `/api/raw-leads/batch` | `src/api/handlers/raw-leads.ts` |
| GET | `/api/raw-leads/check` | `src/api/handlers/raw-leads.ts` |
| GET | `/api/stats` | `src/api/handlers/stats.ts` |

## Contact Pipeline

```
Raw Lead (pending → qualified → rejected)
    ↓ promote (with research data)
Contact: researched → ready → booked → dead
                        ↓
              disposition: "call" | "campaign"
                        ↓
            Call List (/calls) or Campaign (/campaign)
                        ↓
              booked → Pipeline (/pipeline)
              ball_in_court: mine | theirs | scheduled
```

Note: Promoted contacts skip "new" and start as "researched" since they're hydrated before promotion.

## DB Tables

- `raw_leads` — incoming queue
- `contacts` — main pipeline
- `zoominfo_leads` — enrichment data (FK → contacts)
- `contact_research` — research intel (1:1 with contacts)
- `call_log` — activity log for both calls and emails

## Key Contact Fields

- `status`: new (legacy), researched, ready, booked, dead — promoted contacts start as "researched"
- `disposition`: call, campaign, or null
- `follow_up_at`: ISO timestamp for snooze/scheduling
- `ball_in_court`: mine, theirs, scheduled (for booked contacts)
- `ball_in_court_note`: free text context

## Patterns

- API handlers return `{ status, body }` — never throw, never use framework types
- Route wrappers are thin: parse request → call handler → return NextResponse
- Auth: PIN-based HMAC sessions (web cookie) + Bearer token (API/CLI)
- `useSearchParams()` requires `<Suspense>` wrapper in Next.js 16
- Tailwind v4: CSS-first config via `@theme inline` in globals.css
- React 19: `useRef` needs initial value; use ternary not `&&` for `unknown` types

## Environment Variables

Secrets live in `~/openclaw-config/openclaw.json` under `PROVIDER_LEAD_ENGINE_*` keys. Copy to `.env.local` (gitignored).

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Supabase secret key |
| `SUPABASE_DB_PASSWORD` | Postgres password (direct DB) |
| `LEADS_PIN` | Access PIN |
| `LEADS_SECRET` | HMAC signing secret |
| `SALES_ENGINE_API_URL` | API base URL for sales-engine CLI |
| `SALES_ENGINE_API_KEY` | API key for sales-engine CLI |
