import { Command } from "commander";
import { createInterface } from "readline";
import { createApiClient } from "../lib/api-client";
import { loadConfig, saveConfig } from "../lib/config";
import { success, error, info } from "../lib/output";

export function registerAuthCommands(program: Command) {
  const auth = program
    .command("auth")
    .description("Authentication commands");

  auth
    .command("login")
    .description("Authenticate with the API using your access PIN")
    .option("--pin <pin>", "Access PIN (omit for interactive prompt)")
    .action(async (opts: { pin?: string }) => {
      const pin = opts.pin || (await promptSecret("Access PIN: "));

      if (!pin) {
        error("No PIN provided");
        process.exit(1);
      }

      const client = createApiClient();

      try {
        const res = await client.post("/api/auth", { pin });
        const data = await res.json();

        if (res.ok) {
          const setCookie = res.headers.get("set-cookie");
          if (setCookie) {
            const config = loadConfig();
            config.sessionToken = setCookie.split(";")[0];
            saveConfig(config);
          }
          success("Authenticated successfully");
        } else {
          error(data.error || "Authentication failed");
          if (data.cooldown) {
            info(`Retry in ${data.cooldown}s`);
          }
          process.exit(1);
        }
      } catch {
        error("Could not connect to the API. Is the server running?");
        process.exit(1);
      }
    });

  auth
    .command("status")
    .description("Check current authentication status")
    .action(() => {
      const config = loadConfig();
      if (config.sessionToken) {
        success("Authenticated (session token stored)");
      } else {
        info("Not authenticated. Run: ple auth login");
      }
    });

  auth
    .command("logout")
    .description("Clear stored credentials")
    .action(() => {
      const config = loadConfig();
      delete config.sessionToken;
      saveConfig(config);
      success("Logged out");
    });
}

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

function promptSecret(question: string): Promise<string> {
  // Non-TTY fallback (piped input, CI, etc.)
  if (!process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  // Interactive masked input
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf-8");

    let input = "";

    const onData = (char: string) => {
      if (char === "\r" || char === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
      } else if (char === "\u0003") {
        // Ctrl+C
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write("\n");
        process.exit(0);
      } else if (char === "\u007f" || char === "\b") {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else if (char.length === 1 && char >= " ") {
        input += char;
        process.stdout.write("*");
      }
    };

    stdin.on("data", onData);
  });
}
