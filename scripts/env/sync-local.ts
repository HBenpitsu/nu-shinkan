#!/usr/bin/env tsx

import { syncLocalApps } from "./sync-local/apps.js";
import { parseSyncArgs } from "./sync-local/cli.js";
import { printReport } from "./sync-local/report.js";

function main(): void {
  const options = parseSyncArgs(process.argv.slice(2));

  const changes = syncLocalApps(options);

  printReport(options.mode, changes);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`sync-local failed: ${message}`);
  process.exit(1);
}
