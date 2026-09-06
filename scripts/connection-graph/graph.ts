import { resolve } from "node:path";
import { readDeployment, type Deployment } from "@repo/app-config/deployment";
import { workspacePackages, workspaceRoot } from "../workspace/workspace.js";

export type Package = { package: string; path: string };
/** Edges point from a connection destination to its callers. */
export type ConnectionGraph = {
  packages: Package[];
  edges: [string, string][];
  reviewEntries: string[];
};

export function buildConnectionGraph(
  packages: Package[],
  configs: ReadonlyMap<string, Deployment>,
): ConnectionGraph {
  const names = new Set(packages.map((p) => p.package));
  if (names.size !== packages.length)
    throw new Error("Duplicate workspace package name");
  const edges: [string, string][] = [];
  const reviewEntries: string[] = [];
  for (const { package: source } of packages) {
    const config = configs.get(source);
    if (!config) continue;
    if (config.reviewEntry) reviewEntries.push(source);
    const destinations = new Set([
      ...Object.values(config.connections.bindings),
      ...Object.values(config.connections.urls),
    ]);
    for (const target of destinations)
      if (target !== source && names.has(target)) edges.push([target, source]);
  }
  return { packages: packages.map((p) => ({ ...p })), edges, reviewEntries };
}

/** Read every workspace, including packages without deployment.yaml. */
export function buildWorkspaceConnectionGraph(
  root = workspaceRoot(),
): ConnectionGraph {
  const packages = workspacePackages(root);
  return buildConnectionGraph(
    packages,
    new Map(
      packages.map((p) => [p.package, readDeployment(resolve(root, p.path))]),
    ),
  );
}

function reachable(
  graph: Map<string, Set<string>>,
  starts: Iterable<string>,
): Set<string> {
  const seen = new Set<string>();
  const stack = [...starts].filter((name) => graph.has(name));
  while (stack.length) {
    const name = stack.pop()!;
    if (seen.has(name)) continue;
    seen.add(name);
    for (const next of graph.get(name) ?? [])
      if (!seen.has(next)) stack.push(next);
  }
  return seen;
}

/**
 * Select review candidates, preserving workspace order. Starts must already
 * include package-dependency impact. Deploy-script filtering belongs to execution.
 */
export function selectReviewTargets(
  graph: ConnectionGraph,
  sources: Iterable<string>,
): Package[] {
  const forward = new Map(
    graph.packages.map((p) => [p.package, new Set<string>()]),
  );
  const reverse = new Map(
    graph.packages.map((p) => [p.package, new Set<string>()]),
  );
  for (const [from, to] of graph.edges) {
    if (from === to || !forward.has(from) || !forward.has(to)) continue;
    forward.get(from)!.add(to);
    reverse.get(to)!.add(from);
  }
  const fromSources = reachable(forward, sources);
  const toEntries = reachable(reverse, graph.reviewEntries);
  return graph.packages.filter(
    (p) => fromSources.has(p.package) && toEntries.has(p.package),
  );
}
