import { Command } from "commander";
import { readFileSync } from "fs";
import { apiRequest, parseJsonFlag } from "../lib/se-client";

export function registerRawLeadsCommands(program: Command) {
  const rl = program
    .command("raw-leads")
    .description("Raw leads pipeline commands");

  rl.command("list")
    .description("List raw leads")
    .option("--status <status>", "Filter by status (pending, qualified, rejected)")
    .option("--source <source>", "Filter by source")
    .option("--limit <n>", "Max results (default 100, max 500)")
    .option("--offset <n>", "Offset for pagination")
    .action(async (opts: { status?: string; source?: string; limit?: string; offset?: string }) => {
      const query: Record<string, string> = {};
      if (opts.status) query.status = opts.status;
      if (opts.source) query.source = opts.source;
      if (opts.limit) query.limit = opts.limit;
      if (opts.offset) query.offset = opts.offset;
      await apiRequest({ method: "GET", path: "/api/raw-leads", query });
    });

  rl.command("create")
    .description("Create a single raw lead (upsert on source+source_id)")
    .requiredOption("--source <source>", "Lead source (e.g. zoominfo)")
    .option("--source-id <id>", "Source-specific ID")
    .option("--source-url <url>", "Source URL")
    .option("--name <name>", "Contact name")
    .option("--email <email>", "Email address")
    .option("--title <title>", "Job title")
    .option("--company <company>", "Company name")
    .option("--raw-data <json>", "Raw data as JSON string")
    .option("--found-via <text>", "How the lead was found")
    .action(async (opts) => {
      const body: Record<string, unknown> = { source: opts.source };
      if (opts.sourceId) body.source_id = opts.sourceId;
      if (opts.sourceUrl) body.source_url = opts.sourceUrl;
      if (opts.name) body.name = opts.name;
      if (opts.email) body.email = opts.email;
      if (opts.title) body.title = opts.title;
      if (opts.company) body.company = opts.company;
      if (opts.rawData) body.raw_data = parseJsonFlag(opts.rawData, "--raw-data");
      if (opts.foundVia) body.found_via = opts.foundVia;
      await apiRequest({ method: "POST", path: "/api/raw-leads", body });
    });

  rl.command("batch")
    .description("Batch create raw leads from a JSON file")
    .requiredOption("--file <path>", "Path to JSON file with { \"leads\": [...] }")
    .action(async (opts: { file: string }) => {
      let body: unknown;
      try {
        body = JSON.parse(readFileSync(opts.file, "utf-8"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(JSON.stringify({ error: `Failed to read file: ${msg}` }) + "\n");
        process.exit(1);
      }
      await apiRequest({ method: "POST", path: "/api/raw-leads/batch", body });
    });

  rl.command("check")
    .description("Check if a raw lead exists by source+source_id")
    .requiredOption("--source <source>", "Lead source")
    .requiredOption("--source-id <id>", "Source-specific ID")
    .action(async (opts: { source: string; sourceId: string }) => {
      await apiRequest({
        method: "GET",
        path: "/api/raw-leads/check",
        query: { source: opts.source, source_id: opts.sourceId },
      });
    });

  rl.command("update <id>")
    .description("Update a raw lead")
    .option("--status <status>", "New status (pending, qualified, rejected)")
    .option("--rejection-reason <text>", "Reason for rejection")
    .action(async (id: string, opts: { status?: string; rejectionReason?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.status) body.status = opts.status;
      if (opts.rejectionReason) body.rejection_reason = opts.rejectionReason;
      await apiRequest({ method: "PATCH", path: `/api/raw-leads/${id}`, body });
    });

  rl.command("promote <id>")
    .description("Promote a raw lead to a contact")
    .option("--platform-data <json>", "ZoomInfo platform data as JSON string")
    .action(async (id: string, opts: { platformData?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.platformData) {
        body.platform_data = parseJsonFlag(opts.platformData, "--platform-data");
      }
      await apiRequest({ method: "POST", path: `/api/raw-leads/${id}/promote`, body });
    });
}
