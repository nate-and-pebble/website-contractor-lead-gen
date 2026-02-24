import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_FILE = join(homedir(), ".sales-engine", "config.json");

interface SeConfig {
  apiUrl: string;
  apiKey: string;
}

/**
 * Load Sales Engine config. Env vars take precedence over config file.
 * Exits with error if either value is missing.
 */
export function loadSeConfig(): SeConfig {
  let fileConfig: { api_url?: string; api_key?: string } = {};
  try {
    fileConfig = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    // No config file — that's fine, env vars may cover it
  }

  const apiUrl =
    process.env.SALES_ENGINE_API_URL || fileConfig.api_url || "";
  const apiKey =
    process.env.SALES_ENGINE_API_KEY || fileConfig.api_key || "";

  if (!apiUrl) {
    process.stderr.write(
      JSON.stringify({ error: "SALES_ENGINE_API_URL is not set. Set it as an env var or in ~/.sales-engine/config.json" }) + "\n"
    );
    process.exit(1);
  }

  if (!apiKey) {
    process.stderr.write(
      JSON.stringify({ error: "SALES_ENGINE_API_KEY is not set. Set it as an env var or in ~/.sales-engine/config.json" }) + "\n"
    );
    process.exit(1);
  }

  return { apiUrl: apiUrl.replace(/\/+$/, ""), apiKey };
}
