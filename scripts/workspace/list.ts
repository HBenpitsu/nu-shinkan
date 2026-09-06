import { parseArgs } from "node:util";
import { listWorkspacePackages } from "./workspace.js";

// Main Logic

function main(): void {
  const { values } = parseArgs({ options: { root: { type: "string" } } });
  console.log(JSON.stringify(listWorkspacePackages(values.root)));
}

// EntryPoint

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
