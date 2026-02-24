import { Command } from "commander";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { success, error, info } from "../lib/output";
import { createDbClient } from "../../src/db/pg";

function getMigrationFiles(): string[] {
  const dir = join(__dirname, "../../src/db/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(dir, f));
}

export function registerDbCommands(program: Command) {
  const db = program
    .command("db")
    .description("Database management commands");

  db.command("migrate")
    .description("Run all SQL migrations against the database")
    .option("--dry-run", "Print SQL without executing")
    .action(async (opts: { dryRun?: boolean }) => {
      const files = getMigrationFiles();

      if (files.length === 0) {
        info("No migration files found.");
        return;
      }

      info(`Found ${files.length} migration(s):`);
      for (const f of files) {
        info(`  ${f.split("/").pop()}`);
      }

      if (opts.dryRun) {
        info("\n--- DRY RUN (not executing) ---\n");
        for (const f of files) {
          const sql = readFileSync(f, "utf-8");
          info(`-- ${f.split("/").pop()}`);
          info(sql);
        }
        return;
      }

      const client = createDbClient();
      try {
        await client.connect();
        info("Connected to database.");

        for (const f of files) {
          const name = f.split("/").pop()!;
          const sql = readFileSync(f, "utf-8");
          info(`Running ${name}...`);
          await client.query(sql);
          success(name);
        }

        success("All migrations applied.");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        error(`Migration failed: ${msg}`);
        process.exit(1);
      } finally {
        await client.end();
      }
    });

  db.command("status")
    .description("Test database connectivity")
    .action(async () => {
      const client = createDbClient();
      try {
        await client.connect();
        const res = await client.query("SELECT current_database(), now()");
        success("Connected to database");
        info(`  Database: ${res.rows[0].current_database}`);
        info(`  Time:     ${res.rows[0].now}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        error(`Connection failed: ${msg}`);
        process.exit(1);
      } finally {
        await client.end();
      }
    });
}
