import { readDeployment } from "@repo/app-config/deployment";
import {
  commit,
  isAncestor,
  list,
  validatePicks,
  type Package,
} from "./workspace.js";
import { reviewTargets } from "./graph.js";
export type Request = {
  channel: "staging" | "release" | "preview";
  source: "diff" | "full" | "manual-pick";
  head: string;
  base?: string;
  picks: string[];
};
export type Plan = { changes: Package[]; targets: Package[] };
export function plan(
  request: Request,
  deps = { list, commit, isAncestor, readDeployment },
): Plan {
  const { channel, source, head, base, picks } = request;
  if (
    (channel === "preview" && source === "full") ||
    (channel !== "preview" && source === "manual-pick")
  )
    throw new Error("Invalid channel/selection source");
  deps.commit(head);
  const all = deps.list();
  if (source === "full") return { changes: all, targets: all };
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
      return { changes: all, targets: all };
    }
  }
  const targets =
    channel === "preview"
      ? reviewTargets(
          all,
          new Map(all.map((p) => [p.package, deps.readDeployment(p.path)])),
          starts,
        )
      : starts;
  return { changes, targets };
}
