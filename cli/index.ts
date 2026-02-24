import "dotenv/config";
import { config } from "dotenv";
import { join } from "path";
// Load .env.local (Next.js convention) so DB commands have access to env vars
config({ path: join(__dirname, "..", ".env.local") });

import { program } from "commander";
import { registerAuthCommands } from "./commands/auth";
import { registerDbCommands } from "./commands/db";
import { registerServerCommands } from "./commands/server";

program
  .name("ple")
  .description("Provider Lead Engine CLI")
  .version("0.1.0");

registerAuthCommands(program);
registerDbCommands(program);
registerServerCommands(program);

program.parse();
