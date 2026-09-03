#!/usr/bin/env tsx

import { materializeApps } from "./materialize/apps.js";
import { parseArgs } from "./materialize/cli.js";
import { readConfig } from "./materialize/overrides.js";
import { rootDir } from "./materialize/paths.js";

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const config = readConfig();

  const generated = materializeApps(config, options);
  if (generated.length === 0) {
    console.log("No apps were selected for materialize.");
    return;
  }

  console.log("Materialized files:");
  for (const item of generated) {
    console.log(`- ${item.replace(`${rootDir}/`, "")}`);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`materialize failed: ${message}`);
  process.exit(1);
}
