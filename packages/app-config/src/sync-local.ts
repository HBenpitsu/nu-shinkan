#!/usr/bin/env node
import { Dotenv } from "./config-file/dotenv.js";
import { WranglerJsonc } from "./config-file/wrangler.jsonc.js";

import { parseArgs } from "node:util";
import { GlobalRuntimeEnvsYaml } from "./config-file/globalRuntimeEnvs.yaml.js";

// Main Logic

function main(): void {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean" },
      check: { type: "boolean" },
    },
  });
  const local = new GlobalRuntimeEnvsYaml().local;
  syncPackageLocal(local, values["dry-run"] || values.check);
}

function syncPackageLocal(
  local: Record<string, string | null>,
  dryRun = false,
): void {
  const dotenv = new Dotenv();
  const wranglerJsonc = new WranglerJsonc();
  // 共有設定のnullは消費せず、存在するネイティブ設定にだけ反映する。
  if (dotenv.exists()) {
    dotenv.updateVariables(local);
    if (!dryRun) dotenv.rewriteOriginal();
  }
  if (wranglerJsonc.exists()) {
    wranglerJsonc.update({ vars: local });
    if (!dryRun) wranglerJsonc.rewriteOriginal();
  }
}

// EntryPoint
try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
