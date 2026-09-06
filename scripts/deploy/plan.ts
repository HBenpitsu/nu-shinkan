import { commit, isAncestor, list, validatePicks } from "../workspace/query.js";
import { resolveWorkers } from "../workspace/workers.js";
import type { Package, DeployTarget } from "../workspace/workspace.js";
import { reviewTargets } from "./graph.js";
export type Request = {
  channel: "staging" | "release" | "preview";
  source: "diff" | "full" | "manual-pick";
  head: string;
  base?: string;
  picks: string[];
};
export type Plan = { changes: string[]; targets: DeployTarget[] };
export function plan(
  request: Request,
  deps = { list, commit, isAncestor, reviewTargets, resolveWorkers },
): Plan {
  const { channel, source, head, base, picks } = request;
  if (
    (channel === "preview" && source === "full") ||
    (channel !== "preview" && source === "manual-pick")
  )
    throw new Error("Invalid channel/selection source");
  deps.commit(head);
  const all = deps.list();
  if (source === "full")
    return {
      changes: all.map((p) => p.package),
      targets: deps.resolveWorkers(all),
    };
  let changes: Package[], starts: Package[];
  if (source === "manual-pick") {
    const names = validatePicks(picks, all);
    changes = all.filter((p) => names.includes(p.package));
    starts = deps.list(names.map((name) => `...${name}`));
  } else {
    try {
      if (!base) throw new Error("No comparison base");
      const resolvedBase = deps.commit(base);
      if (channel !== "preview" && !deps.isAncestor(resolvedBase, head))
        throw new Error("Non-forward tag movement");
      changes = deps.list([`[${resolvedBase}...${head}]`]);
      starts = deps.list([`...[${resolvedBase}...${head}]`]);
    } catch (error) {
      if (channel === "preview") throw error;
      console.warn(`Falling back to full at ${head}: ${String(error)}`);
      return {
        changes: all.map((p) => p.package),
        targets: deps.resolveWorkers(all),
      };
    }
  }
  const targets =
    channel === "preview"
      ? deps.reviewTargets(starts.map((p) => p.package)).map((name) => {
          const pkg = all.find((p) => p.package === name);
          if (!pkg) throw new Error(`Unknown graph target: ${name}`);
          return pkg;
        })
      : starts;
  return {
    changes: changes.map((p) => p.package),
    targets: deps.resolveWorkers(targets),
  };
}
