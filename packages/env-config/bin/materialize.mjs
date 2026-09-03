#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const binDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(binDir, "../../..");
const scriptPath = resolve(repoRoot, "scripts/env/materialize.ts");
const userArgs = process.argv.slice(2);

function hasAppArg(args) {
  return args.some((arg, idx) => arg === "--app" || arg.startsWith("--app=") || (idx > 0 && args[idx - 1] === "--app"));
}

function inferAppNameFromCwd(cwd) {
  const rel = relative(repoRoot, cwd);
  if (!rel || rel.startsWith("..") || rel.startsWith(`..${sep}`)) {
    return undefined;
  }

  const parts = rel.split(sep);
  if (parts.length < 2 || parts[0] !== "apps") {
    return undefined;
  }

  return parts[1];
}

if (!hasAppArg(userArgs)) {
  const inferredApp = inferAppNameFromCwd(process.cwd());
  if (inferredApp) {
    userArgs.push("--app", inferredApp);
  }
}

const result = spawnSync(
  "pnpm",
  ["--workspace-root", "exec", "tsx", scriptPath, ...userArgs],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
