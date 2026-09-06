import type { Deployment } from "@repo/app-config/deployment";
import type { Package } from "./workspace.js";
function reachable(
  graph: Map<string, Set<string>>,
  starts: string[],
): Set<string> {
  const seen = new Set(starts),
    stack = [...seen];
  while (stack.length)
    for (const next of graph.get(stack.pop()!) ?? [])
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
  return seen;
}
export function reviewTargets(
  packages: Package[],
  configs: Map<string, Deployment>,
  starts: Package[],
): Package[] {
  const forward = new Map(packages.map((p) => [p.package, new Set<string>()]));
  const reverse = new Map(packages.map((p) => [p.package, new Set<string>()]));
  for (const [source, config] of configs)
    for (const target of [
      ...Object.values(config.connections.bindings),
      ...Object.values(config.connections.urls),
    ]) {
      if (source === target || !forward.has(target) || !forward.has(source))
        continue;
      forward.get(target)!.add(source);
      reverse.get(source)!.add(target);
    }
  const f = reachable(
    forward,
    starts.map((p) => p.package),
  );
  const r = reachable(
    reverse,
    [...configs].filter(([, c]) => c.reviewEntry).map(([name]) => name),
  );
  return packages.filter((p) => f.has(p.package) && r.has(p.package));
}
