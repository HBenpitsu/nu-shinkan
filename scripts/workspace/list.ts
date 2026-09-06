import { parseArgs } from "node:util";
import { workspacePackages } from "./workspace.js";
try {
  const { values } = parseArgs({ options: { root: { type: "string" } } });
  console.log(JSON.stringify(workspacePackages(values.root)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
