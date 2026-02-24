import { program } from "commander";
import { registerRawLeadsCommands } from "./commands/raw-leads";
import { registerContactsCommands } from "./commands/contacts";
import { registerResearchCommands } from "./commands/research";
import { registerStatsCommand } from "./commands/stats";

program
  .name("sales-engine")
  .description("Sales Engine CLI — machine-readable API client")
  .version("0.1.0");

registerRawLeadsCommands(program);
registerContactsCommands(program);
registerResearchCommands(program);
registerStatsCommand(program);

program.parse();
