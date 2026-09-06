import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, type ParseError } from "jsonc-parser";
import {
  listWorkspacePackages,
  findWorkspaceRoot,
  type Package,
  type DeployTarget,
} from "./workspace.js";

// Main Logic

export function collectWorkerNames(
  targets: unknown,
  root = findWorkspaceRoot(),
): Record<string, string> {
  const packages = listWorkspacePackages(root);
  if (!Array.isArray(targets)) throw new Error("Expected target array");
  const workers: Record<string, string> = Object.create(null);
  // 入力の名前とパスをworkspace一覧に照合してから設定を読む。
  // 対象外Workerの情報は不要なので収集しない。
  for (const target of targets) {
    const pkg = packages.find(
      (p) => p.package === target?.package && p.path === target?.path,
    );
    if (!pkg) throw new Error(`Invalid target: ${JSON.stringify(target)}`);
    const name = readWorkerName(pkg, root);
    if (name !== undefined) workers[pkg.package] = name;
  }
  return workers;
}

/** 計画側で列挙・検証済みのパッケージにWorker名を付与する。 */
export function resolveWorkers(packages: Package[]): DeployTarget[] {
  return packages.map((pkg) => {
    const workerName = readWorkerName(pkg, process.cwd());
    return workerName === undefined ? { ...pkg } : { ...pkg, workerName };
  });
}

// Helper
function readWorkerName(pkg: Package, root: string): string | undefined {
  const file = resolve(root, pkg.path, "wrangler.jsonc");
  // 共有ライブラリなど、Workerではない対象も保持する。
  if (!existsSync(file)) return undefined;
  const errors: ParseError[] = [];
  const config = parse(readFileSync(file, "utf8"), errors);
  if (errors.length || typeof config?.name !== "string" || !config.name)
    throw new Error(`Invalid Worker config: ${pkg.package}`);
  return config.name;
}
