# Provider Lead Engine

A Next.js application for finding and connecting with providers. See `architecture.md` for full system design.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

3. Populate secrets in `.env.local`. All credentials are stored in `~/openclaw-config/openclaw.json` under the `PROVIDER_LEAD_ENGINE_*` keys. See `.env.example` for the full list. Key mappings:

| `.env.local` variable | Purpose |
|---|---|
| `SALES_ENGINE_API_KEY` | Bearer token for API route auth |
| `SUPABASE_URL` | Supabase project URL (server-side) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (public) |
| `SUPABASE_SECRET_KEY` | Supabase service role key (server only) |
| `SUPABASE_DB_HOST` | Postgres host (from Supabase dashboard → Connect) |
| `SUPABASE_DB_PORT` | Postgres port (default `5432`) |
| `SUPABASE_DB_USER` | Postgres user (default `postgres`) |
| `SUPABASE_DB_PASSWORD` | Postgres password |
| `SUPABASE_DB_NAME` | Postgres database (default `postgres`) |
| `SUPABASE_DB_SSLMODE` | SSL mode (`require` for Supabase) |
| `LEADS_PIN` | PIN for web UI login |
| `LEADS_SECRET` | HMAC secret for session signing |

> Never hardcode secrets. `.env*` files are gitignored.

4. Verify DB connectivity:

```bash
npm run cli -- db status
```

5. Run the dev server:

```bash
npm run dev
```

## CLI

```bash
npm run cli -- <command>
```

Key commands: `auth login`, `db migrate`, `db status`, `dev`, `build`. See `architecture.md` for full CLI docs.

## Deploy

Deployed on Vercel. Environment variables are configured in the Vercel dashboard.
