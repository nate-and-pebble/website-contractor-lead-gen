import { Command } from "commander";
import { apiRequest, parseJsonFlag } from "../lib/se-client";

export function registerResearchCommands(program: Command) {
  const r = program
    .command("research")
    .description("Contact research commands");

  r.command("get <contact_id>")
    .description("Get research for a contact")
    .action(async (contactId: string) => {
      await apiRequest({ method: "GET", path: `/api/contacts/${contactId}/research` });
    });

  r.command("update <contact_id>")
    .description("Create or replace research for a contact")
    .requiredOption("--summary <text>", "Research summary")
    .requiredOption("--research-data <json>", "Research data as JSON string")
    .action(async (contactId: string, opts: { summary: string; researchData: string }) => {
      const researchData = parseJsonFlag(opts.researchData, "--research-data");
      await apiRequest({
        method: "PUT",
        path: `/api/contacts/${contactId}/research`,
        body: { summary: opts.summary, research_data: researchData },
      });
    });
}
