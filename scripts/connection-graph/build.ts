import { parseArgs } from "node:util";
import { ConnectionGraph } from "./graph.js";
import { DeploymentYaml } from "@repo/app-config/deployment";
import { getWorkspaceConfigurations } from "../workspace/configs.js";

try {
  const { values } = parseArgs({ options: { root: { type: "string" } } });
  const packages = getWorkspaceConfigurations(values.root);
  const graph = ConnectionGraph.fromDeployments(
    packages.map((pkg) => pkg.packageName),
    new Map(
      packages.map((pkg) => [pkg.packageName, new DeploymentYaml(pkg.path)]),
    ),
  );
  console.log(JSON.stringify(graph, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
