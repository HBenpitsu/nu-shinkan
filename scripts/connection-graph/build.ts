import { parseArgs } from "node:util";
import { buildWorkspaceConnectionGraph } from "./graph.js";

// Main Logic

function main(): void {
  const { values } = parseArgs({ options: { root: { type: "string" } } });
  console.log(
    JSON.stringify(buildWorkspaceConnectionGraph(values.root), null, 2),
  );
}

// EntryPoint

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
