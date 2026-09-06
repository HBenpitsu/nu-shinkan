import { execFileSync } from "node:child_process";
import type { Package } from "./workspace.js";

/** The connection-graph tools exchange JSON through stdout/stdin. */
export function reviewTargets(starts: Package[]): Package[] {
  const graph = execFileSync(
    "pnpm",
    ["exec", "tsx", "scripts/connection-graph/build.ts"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  return JSON.parse(
    execFileSync(
      "pnpm",
      [
        "exec",
        "tsx",
        "scripts/connection-graph/select.ts",
        "--graph",
        "-",
        "--",
        ...starts.map((p) => p.package),
      ],
      { input: graph, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] },
    ),
  );
}
