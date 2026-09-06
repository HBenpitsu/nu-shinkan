#!/usr/bin/env node
import { dotenv } from "./config-file/dotenv.js";
import { wranglerJsonc } from "./config-file/wrangler.jsonc.js";

import { parseArgs } from "node:util";
import { readGlobalRuntimeEnvs } from "./config-file/globalRuntimeEnvs.yaml.js";

// Main Logic

function main(): void {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean" },
      check: { type: "boolean" },
    },
  });
  const local = readGlobalRuntimeEnvs().local;
  syncPackageLocal(local, values["dry-run"] || values.check);
}

function syncPackageLocal(
  local: Record<string, string | null>,
  dryRun = false,
): void {
  // 共有設定のnullは消費せず、存在するネイティブ設定にだけ反映する。
  if (dotenv.exists()) dotenv.modify(dotenv.withVitePrefix(local), dryRun);
  if (wranglerJsonc.exists()) wranglerJsonc.modify({ vars: local }, dryRun);
}

// EntryPoint
try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
