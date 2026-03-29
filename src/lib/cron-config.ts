// ---------------------------------------------------------------------------
// Cron config parser — extracts and validates the ```cron_config JSON block
// from a markdown document.
// ---------------------------------------------------------------------------

export interface CronConfig {
  budget_usd: number;
  lead_count: number;
  verticals: string[];
  roles: string[];
  enabled: boolean;
  cron_schedule?: string;
}

/**
 * Extract the contents of a fenced code block tagged `cron_config` from markdown.
 * Returns the raw JSON string, or null if not found.
 */
export function extractCronConfigRaw(markdown: string): string | null {
  // Match ```cron_config ... ``` (with optional whitespace around the tag)
  const re = /```\s*cron_config\s*\n([\s\S]*?)```/;
  const match = markdown.match(re);
  return match ? match[1].trim() : null;
}

/**
 * Parse and validate the cron_config block from markdown.
 * Throws descriptive errors on validation failure.
 */
export function parseCronConfig(markdown: string): CronConfig {
  const raw = extractCronConfigRaw(markdown);
  if (!raw) {
    throw new CronConfigError(
      "Missing ```cron_config``` block. Markdown must contain a fenced code block tagged cron_config with JSON."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CronConfigError(`Invalid JSON in cron_config block: ${(raw).slice(0, 200)}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new CronConfigError("cron_config must be a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  // Required fields
  if (typeof obj.budget_usd !== "number" || obj.budget_usd <= 0) {
    throw new CronConfigError("budget_usd must be a positive number");
  }
  if (typeof obj.lead_count !== "number" || obj.lead_count < 0 || !Number.isInteger(obj.lead_count)) {
    throw new CronConfigError("lead_count must be a non-negative integer");
  }
  if (!Array.isArray(obj.verticals) || obj.verticals.length === 0 || !obj.verticals.every((v) => typeof v === "string")) {
    throw new CronConfigError("verticals must be a non-empty array of strings");
  }
  if (!Array.isArray(obj.roles) || obj.roles.length === 0 || !obj.roles.every((r) => typeof r === "string")) {
    throw new CronConfigError("roles must be a non-empty array of strings");
  }
  if (typeof obj.enabled !== "boolean") {
    throw new CronConfigError("enabled must be a boolean");
  }

  // Optional fields
  if (obj.cron_schedule !== undefined && typeof obj.cron_schedule !== "string") {
    throw new CronConfigError("cron_schedule must be a string if provided");
  }

  return {
    budget_usd: obj.budget_usd,
    lead_count: obj.lead_count,
    verticals: obj.verticals as string[],
    roles: obj.roles as string[],
    enabled: obj.enabled,
    cron_schedule: obj.cron_schedule as string | undefined,
  };
}

export class CronConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CronConfigError";
  }
}
