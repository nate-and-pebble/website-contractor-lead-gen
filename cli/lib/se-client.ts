import { loadSeConfig } from "./se-config";

interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "PUT";
  path: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
}

/**
 * Make an authenticated API request. On non-2xx, prints error to stderr and exits 1.
 * On success, prints response JSON to stdout.
 */
export async function apiRequest(opts: RequestOptions): Promise<void> {
  const { apiUrl, apiKey } = loadSeConfig();

  let url = `${apiUrl}${opts.path}`;

  if (opts.query) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(opts.query)) {
      if (Array.isArray(val)) {
        for (const v of val) params.append(key, v);
      } else {
        params.append(key, val);
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const fetchOpts: RequestInit = { method: opts.method, headers };
  if (opts.body !== undefined) {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url, fetchOpts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(JSON.stringify({ error: `Request failed: ${msg}` }) + "\n");
    process.exit(1);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { error: `Non-JSON response: ${text.slice(0, 200)}` };
  }

  if (!res.ok) {
    process.stderr.write(JSON.stringify(json) + "\n");
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(json) + "\n");
}

/**
 * Parse a JSON string flag value. Exits with error if invalid.
 */
export function parseJsonFlag(value: string, flagName: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    process.stderr.write(
      JSON.stringify({ error: `Invalid JSON for ${flagName}: ${value}` }) + "\n"
    );
    process.exit(1);
  }
}
