#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseContext } from "./materialize/context.js";
import { readSettings } from "./materialize/settings.js";
import { generateDotenv } from "./materialize/dotenv.js";
import { generateWranglerJsonc } from "./materialize/wrangler.js";
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
function run(args: string[]) {
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (existsSync("vite.config.ts")) {
  run(["exec", "tsc", "-b"]);
  run(["exec", "vite", "build", "--mode", deploy ? "deploy" : "development"]);
} else if (!deploy)
  run(["exec", "wrangler", "deploy", "--dry-run", "--outdir", "dist"]);
