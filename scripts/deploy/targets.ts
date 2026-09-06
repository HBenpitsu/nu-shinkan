import { resolveWorkers } from "../workspace/workers.js";
import type { Package, DeployTarget } from "../workspace/workspace.js";
import { reviewTargets } from "./graph.js";
export type Plan = { changes: string[]; targets: DeployTarget[] };
export function createPlan(
  all: Package[],
  changes: Package[],
  starts: Package[],
  review = false,
  deps = { reviewTargets, resolveWorkers },
): Plan {
  const targets = review
    ? deps.reviewTargets(starts.map((p) => p.package)).map((name) => {
        const pkg = all.find((p) => p.package === name);
        if (!pkg) throw Error(`Unknown graph target: ${name}`);
        return pkg;
      })
    : starts;
  return {
    changes: changes.map((p) => p.package),
    targets: deps.resolveWorkers(targets),
  };
}
