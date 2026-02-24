import { loadConfig } from "./config";

export interface ApiClient {
  post(path: string, body: Record<string, unknown>): Promise<Response>;
  get(path: string): Promise<Response>;
}

export function createApiClient(): ApiClient {
  const config = loadConfig();
  const baseUrl =
    config.apiUrl || process.env.PLE_API_URL || "http://localhost:3000";

  function headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) {
      h["Cookie"] = config.sessionToken;
    }
    return h;
  }

  return {
    async post(path, body) {
      return fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      });
    },

    async get(path) {
      return fetch(`${baseUrl}${path}`, {
        headers: headers(),
      });
    },
  };
}
