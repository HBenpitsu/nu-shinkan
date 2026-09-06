import { execFileSync } from "node:child_process";
import type { Package } from "./workspace.js";

export function normalizeWorkspace(value: unknown): Package[] {
  const items = (value as { packages?: { items?: unknown } })?.packages?.items;
  if (!Array.isArray(items)) throw new Error("Invalid turbo ls output");
  return items
    .map((item) => {
      if (typeof item.name !== "string" || typeof item.path !== "string")
        throw new Error("Invalid turbo package");
      return { package: item.name as string, path: item.path as string };
    })
    .sort((a, b) => a.package.localeCompare(b.package));
}
export function list(filters: string[] = []): Package[] {
  return normalizeWorkspace(
    JSON.parse(
      execFileSync(
        "pnpm",
        [
          "exec",
          "turbo",
          "ls",
          "--output=json",
          ...filters.map((f) => `--filter=${f}`),
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
      ),
    ),
  );
}
export function validatePicks(names: string[], packages: Package[]): string[] {
  const valid = [
    ...new Set(
      names.filter((name) => packages.some((p) => p.package === name)),
    ),
  ];
  const unknown = names.filter((name) => !valid.includes(name));
  if (!names.length || unknown.length)
    throw new Error(
      `Usage: /preview <package-name> ...${unknown.length ? `\nUnknown: ${unknown.join(", ")}` : ""}${valid.length ? `\nTry: /preview ${valid.join(" ")}` : ""}`,
    );
  return valid;
}
export function commit(sha: string): string {
  if (!/^[a-f0-9]{40}$/i.test(sha))
    throw new Error("Expected a fixed commit SHA");
  return execFileSync("git", ["rev-parse", "--verify", `${sha}^{commit}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
export function isAncestor(base: string, head: string): boolean {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", base, head], {
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}
