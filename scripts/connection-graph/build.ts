import { parseArgs } from "node:util";
import { ConnectionGraph } from "./graph.js";
import { resolve } from "node:path";
import { DeploymentYaml } from "@repo/app-config/deployment";
import {
  listWorkspacePackages,
  findWorkspaceRoot,
} from "../workspace/workspace.js";

// Main Logic

function main(): void {
  const { values } = parseArgs({ options: { root: { type: "string" } } });
  const root = values.root ?? findWorkspaceRoot();
  const packages = listWorkspacePackages(root);
  const deployments = new Map(
    packages.map((pkg) => [
      pkg.package,
      new DeploymentYaml(resolve(root, pkg.path)),
    ]),
  );
  const graph = ConnectionGraph.fromDeployments(
    packages.map((p) => p.package),
    deployments,
  );
  console.log(JSON.stringify(graph, null, 2));
}

// EntryPoint

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
