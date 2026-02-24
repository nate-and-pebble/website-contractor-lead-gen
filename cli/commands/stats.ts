import { Command } from "commander";
import { apiRequest } from "../lib/se-client";

export function registerStatsCommand(program: Command) {
  program
    .command("stats")
    .description("Get pipeline summary stats")
    .action(async () => {
      await apiRequest({ method: "GET", path: "/api/stats" });
    });
}
