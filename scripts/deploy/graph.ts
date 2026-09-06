import { execFileSync } from "node:child_process";

/** The connection-graph tools exchange JSON through stdout/stdin. */
export function reviewTargets(starts: string[]): string[] {
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
        ...starts,
      ],
      { input: graph, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] },
    ),
  );
}
