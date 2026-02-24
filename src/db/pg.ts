import { Pool, Client, type ConnectionConfig } from "pg";

/**
 * Shared Postgres connection config, read from SUPABASE_DB_* env vars.
 */
function getConnectionConfig(): ConnectionConfig {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error("SUPABASE_DB_PASSWORD is not set");
  }

  // Prefer pooler host if available (direct DB host may not resolve outside VPC)
  const host =
    process.env.SUPABASE_POOLER_HOST ??
    process.env.SUPABASE_DB_HOST ??
    "localhost";
  const user =
    process.env.SUPABASE_POOLER_USER ??
    process.env.SUPABASE_DB_USER ??
    "postgres";

  return {
    host,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user,
    password,
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
    ssl:
      process.env.SUPABASE_DB_SSLMODE === "require" || process.env.SUPABASE_POOLER_HOST
        ? { rejectUnauthorized: false }
        : undefined,
  };
}

let pool: Pool | null = null;

/**
 * Lazy-initialized pg Pool for server-side queries and transactions.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ ...getConnectionConfig(), max: 5 });
  }
  return pool;
}

/**
 * Create a standalone pg Client (for migrations / one-off scripts).
 * Caller is responsible for calling client.connect() and client.end().
 */
export function createDbClient(): Client {
  return new Client({
    ...getConnectionConfig(),
    connectionTimeoutMillis: 10_000,
  });
}
