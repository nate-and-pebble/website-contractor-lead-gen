import { Command } from "commander";
import { spawnSync } from "child_process";
import { info } from "../lib/output";

export function registerServerCommands(program: Command) {
  program
    .command("dev")
    .description("Start the Next.js development server")
    .option("-p, --port <port>", "Port number", "3000")
    .action((opts: { port: string }) => {
      info(`Starting dev server on port ${opts.port}...`);
      const result = spawnSync("npx", ["next", "dev", "-p", opts.port], {
        stdio: "inherit",
        cwd: process.cwd(),
        shell: process.platform === "win32",
      });
      process.exit(result.status ?? 1);
    });

  program
    .command("build")
    .description("Build for production")
    .action(() => {
      info("Building for production...");
      const result = spawnSync("npx", ["next", "build"], {
        stdio: "inherit",
        cwd: process.cwd(),
        shell: process.platform === "win32",
      });
      process.exit(result.status ?? 1);
    });
}
