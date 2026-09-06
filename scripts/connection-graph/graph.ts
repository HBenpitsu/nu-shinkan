import { resolve } from "node:path";
import {
  readDeploymentYaml,
  type Deployment,
} from "@repo/app-config/deployment";
import {
  listWorkspacePackages,
  findWorkspaceRoot,
} from "../workspace/workspace.js";

export type Package = { package: string; path: string };
/** Edges point from a connection destination to its callers. */
export type ConnectionGraph = {
  packages: Package[];
  edges: [string, string][];
  reviewEntries: string[];
};

// Main Logic

/** Read every workspace, including packages without deployment.yaml. */
export function buildWorkspaceConnectionGraph(
  root = findWorkspaceRoot(),
): ConnectionGraph {
  const packages = listWorkspacePackages(root);
  return buildConnectionGraph(
    packages,
    new Map(
      packages.map((p) => [
        p.package,
        readDeploymentYaml(resolve(root, p.path)),
      ]),
    ),
  );
}

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
    // URLとBindingが同じ接続先を指していても、探索用の辺は一つにする。
    const destinations = new Set([
      ...Object.values(config.connections.bindings),
      ...Object.values(config.connections.urls),
    ]);
    // APIの変更から呼び出し元Webへ辿れるよう、実際の接続と逆向きにする。
    for (const target of destinations)
      if (target !== source && names.has(target)) edges.push([target, source]);
  }
  return { packages: packages.map((p) => ({ ...p })), edges, reviewEntries };
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
  // 起点から辿れるだけでは入口のない枝も含む。入口へ戻れる集合との積で絞る。
  const fromSources = collectReachable(forward, sources);
  const toEntries = collectReachable(reverse, graph.reviewEntries);
  return graph.packages.filter(
    (p) => fromSources.has(p.package) && toEntries.has(p.package),
  );
}

// Helper

function collectReachable(
  graph: Map<string, Set<string>>,
  starts: Iterable<string>,
): Set<string> {
  // 訪問済み管理で循環を止め、再帰を使わず長い経路にも対応する。
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
