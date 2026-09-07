#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseContext } from "./materialize/context.js";
import { readSettings } from "./materialize/settings.js";
import { generateDotenv } from "./materialize/dotenv.js";
import { generateWranglerJsonc } from "./materialize/wrangler.js";

// Main Logic

function main(): void {
  // deploy情報が一つでも渡されたら検証する。不完全な入力をlocal扱いにしない。
  const deploy =
    process.env.DEPLOY_CHANNEL !== undefined ||
    process.env.TARGETS !== undefined ||
    process.env.PR_NUMBER !== undefined;
  if (deploy) {
    const context = parseContext();
    const settings = readSettings(context);
    generateDotenv(settings, context);
    generateWranglerJsonc(settings, context);
  }
  if (existsSync("vite.config.ts")) {
    run(["exec", "tsc", "-b"]);
    run(["exec", "vite", "build", "--mode", deploy ? "deploy" : "development"]);
  } else if (!deploy)
    run(["exec", "wrangler", "deploy", "--dry-run", "--outdir", "dist"]);
}

// Helper

function run(args: string[]) {
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// EntryPoint

main();
