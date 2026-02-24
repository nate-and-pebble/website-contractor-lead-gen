import { Command } from "commander";
import { apiRequest } from "../lib/se-client";

export function registerContactsCommands(program: Command) {
  const c = program
    .command("contacts")
    .description("Contacts management commands");

  c.command("list")
    .description("List contacts")
    .option("--status <status...>", "Filter by status (can pass multiple: --status new --status ready)")
    .option("--search <text>", "Search across name, email, company")
    .option("--limit <n>", "Max results (default 50)")
    .option("--offset <n>", "Offset for pagination")
    .action(async (opts: { status?: string[]; search?: string; limit?: string; offset?: string }) => {
      const query: Record<string, string | string[]> = {};
      if (opts.status && opts.status.length > 0) query.status = opts.status;
      if (opts.search) query.search = opts.search;
      if (opts.limit) query.limit = opts.limit;
      if (opts.offset) query.offset = opts.offset;
      await apiRequest({ method: "GET", path: "/api/contacts", query });
    });

  c.command("get <id>")
    .description("Get full contact detail (includes zoominfo + research)")
    .action(async (id: string) => {
      await apiRequest({ method: "GET", path: `/api/contacts/${id}` });
    });

  c.command("create")
    .description("Create a contact (dedup on email)")
    .requiredOption("--first <name>", "First name")
    .requiredOption("--last <name>", "Last name")
    .option("--email <email>", "Email address")
    .option("--phone <phone>", "Phone number")
    .option("--title <title>", "Job title")
    .option("--company <company>", "Company name")
    .action(async (opts) => {
      const body: Record<string, unknown> = {
        first_name: opts.first,
        last_name: opts.last,
      };
      if (opts.email) body.email = opts.email;
      if (opts.phone) body.phone = opts.phone;
      if (opts.title) body.title = opts.title;
      if (opts.company) body.company = opts.company;
      await apiRequest({ method: "POST", path: "/api/contacts", body });
    });

  c.command("update <id>")
    .description("Update a contact")
    .option("--status <status>", "New status (new, researched, ready, booked, dead)")
    .option("--email <email>", "Email address")
    .option("--phone <phone>", "Phone number")
    .option("--title <title>", "Job title")
    .option("--company <company>", "Company name")
    .option("--quality-score <n>", "Quality score (integer)")
    .option("--notes <text>", "Notes")
    .action(async (id: string, opts) => {
      const body: Record<string, unknown> = {};
      if (opts.status) body.status = opts.status;
      if (opts.email) body.email = opts.email;
      if (opts.phone) body.phone = opts.phone;
      if (opts.title) body.title = opts.title;
      if (opts.company) body.company = opts.company;
      if (opts.qualityScore) body.quality_score = Number(opts.qualityScore);
      if (opts.notes) body.notes = opts.notes;
      await apiRequest({ method: "PATCH", path: `/api/contacts/${id}`, body });
    });
}
