#!/usr/bin/env node
const { spawnSync } = require("child_process");
const { join } = require("path");

const entry = join(__dirname, "..", "cli", "index.ts");
const result = spawnSync("npx", ["tsx", entry, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: join(__dirname, ".."),
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
