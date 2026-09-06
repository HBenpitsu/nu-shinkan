import { existsSync, readFileSync, globSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";

// Main Logic

export function listWorkspacePackages(
  root = findWorkspaceRoot(),
): { package: string; path: string }[] {
  const config = YAML.parse(
    readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"),
  );
  const patterns = config.packages as string[];
  // pnpmの否定パターンはglobの除外条件として渡す。
  const dirs = globSync(
    patterns.filter((p) => !p.startsWith("!")),
    {
      cwd: root,
      exclude: patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1)),
    },
  );
  return dirs
    .flatMap((path) => {
      const file = join(root, path, "package.json");
      if (!existsSync(file)) return [];
      const manifest = JSON.parse(readFileSync(file, "utf8"));
      if (!manifest.name) throw new Error(`Unnamed workspace: ${path}`);
      return [{ package: manifest.name as string, path }];
    })
    .sort((a, b) => a.package.localeCompare(b.package));
}

// Helper

export function findWorkspaceRoot(start = process.cwd()): string {
  let current = resolve(start);
  while (!existsSync(join(current, "pnpm-workspace.yaml"))) {
    const parent = dirname(current);
    if (parent === current) throw new Error("pnpm-workspace.yaml not found");
    current = parent;
  }
  return current;
}
